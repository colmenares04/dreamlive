from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import AgencyORM, LicenseORM
from app.adapters.security.handlers import hash_password
from app.infrastructure.api.v2.web.audit_helper import create_audit_log

router = APIRouter(prefix="/agencies", tags=["Agencies V2"])


class AgencyOut(BaseModel):
    id: str | None
    name: str
    is_active: bool


class CreateAgencyRequest(BaseModel):
    name: str
    email: Optional[str] = None
    password: Optional[str] = None
    superagent: Optional[str] = None
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None
    code: Optional[str] = None
    owner_id: Optional[str] = None


class ConfirmDeleteAgencyBody(BaseModel):
    password: str


@router.get("/", response_model=List[AgencyOut])
async def list_agencies(
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AgencyORM))
    agencies = res.scalars().all()
    return [AgencyOut(id=a.id, name=a.name, is_active=a.is_active) for a in agencies]


@router.post("/", response_model=AgencyOut)
async def create_agency(
    payload: CreateAgencyRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.email == payload.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El correo de la agencia ya está registrado.")

    agency_id = str(uuid.uuid4())
    code = payload.code or "".join([c for c in payload.name.upper() if c.isalnum()])[:20]
    
    new_agency = AgencyORM(
        id=agency_id,
        name=payload.name,
        code=code,
        email=payload.email,
        password=payload.password,
        is_active=True,
        role_permissions={},
    )
    uow.session.add(new_agency)
    await uow.session.flush()

    # Create the first superagent profile linked to the agency
    if payload.superagent:
        from datetime import datetime, timedelta, timezone
        lic_id = str(uuid.uuid4())
        lic_key = f"DL-{str(uuid.uuid4())[:8].upper()}"
        new_license = LicenseORM(
            id=lic_id,
            key=lic_key,
            agency_id=agency_id,
            recruiter_name=payload.superagent,
            email=payload.admin_email or payload.email,
            admin_password=payload.admin_password or payload.password,
            is_active=True,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            role="agency_admin",
            keywords="",
        )
        uow.session.add(new_license)
        await uow.session.flush()

    await create_audit_log(
        uow=uow,
        category="AGENCY",
        action=f"Creación de agencia: {payload.name}",
        entity_name="Agency",
        entity_id=agency_id
    )
    await uow.session.commit()
    return AgencyOut(id=agency_id, name=payload.name, is_active=True)


@router.delete("/{agency_id}")
async def delete_agency(
    agency_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == agency_id))
    agency = res.scalar_one_or_none()
    if agency:
        name = agency.name
        await uow.session.delete(agency)
        await uow.session.flush()
        
        await create_audit_log(
            uow=uow,
            category="AGENCY",
            action=f"Eliminación de agencia: {name}",
            entity_name="Agency",
            entity_id=agency_id
        )
        await uow.session.commit()
    return {"status": "deleted"}


@router.get("/{agency_id}/stats")
async def get_agency_stats(
    agency_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func, and_
    from app.adapters.db.models import LicenseORM, LeadORM
    from app.core.entities.lead import LeadStatus
    from datetime import datetime, timezone
    
    # 1. Licencias
    res_licenses = await uow.session.execute(select(LicenseORM).where(LicenseORM.agency_id == agency_id))
    licenses_objs = res_licenses.scalars().all()
    
    # 2. Stats globales de la agencia
    res_total = await uow.session.execute(select(func.count()).select_from(LeadORM).where(LeadORM.agency_id == agency_id))
    total_leads = res_total.scalar() or 0

    res_cont = await uow.session.execute(select(func.count()).select_from(LeadORM).where(and_(LeadORM.agency_id == agency_id, LeadORM.status == LeadStatus.CONTACTED)))
    contacted_total = res_cont.scalar() or 0

    res_avail = await uow.session.execute(select(func.count()).select_from(LeadORM).where(and_(LeadORM.agency_id == agency_id, LeadORM.status == LeadStatus.AVAILABLE)))
    available_leads = res_avail.scalar() or 0
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    res_today_coll = await uow.session.execute(select(func.count()).select_from(LeadORM).where(and_(LeadORM.agency_id == agency_id, LeadORM.created_at >= today_start)))
    today_collected = res_today_coll.scalar() or 0

    res_today_cont = await uow.session.execute(select(func.count()).select_from(LeadORM).where(and_(LeadORM.agency_id == agency_id, LeadORM.status == LeadStatus.CONTACTED, LeadORM.created_at >= today_start)))
    today_contacted = res_today_cont.scalar() or 0

    # 3. Stats por licencia (para la tabla en el modal)
    licenses_data = []
    for l in licenses_objs:
        res_l_total = await uow.session.execute(select(func.count()).select_from(LeadORM).where(LeadORM.license_id == str(l.id)))
        l_total = res_l_total.scalar() or 0
        
        res_l_cont = await uow.session.execute(select(func.count()).select_from(LeadORM).where(and_(LeadORM.license_id == str(l.id), LeadORM.status == LeadStatus.CONTACTED)))
        l_cont = res_l_cont.scalar() or 0
        
        res_l_avail = await uow.session.execute(select(func.count()).select_from(LeadORM).where(and_(LeadORM.license_id == str(l.id), LeadORM.status == LeadStatus.AVAILABLE)))
        l_avail = res_l_avail.scalar() or 0

        licenses_data.append({
            "id": str(l.id),
            "key": l.key,
            "recruiter_name": l.recruiter_name,
            "is_active": l.is_active,
            "expires_at": l.expires_at.isoformat() if l.expires_at else None,
            "limit_requests": l.request_limit,
            "refresh_minutes": l.refresh_minutes,
            "admin_password": l.admin_password,
            "stats": {
                "total": l_total,
                "contacted": l_cont,
                "available": l_avail
            }
        })
    
    return {
        "stats": {
            "total_leads": total_leads,
            "contacted_total": contacted_total,
            "available_leads": available_leads,
            "today_collected": today_collected,
            "today_contacted": today_contacted,
            "collected_leads": total_leads - available_leads - contacted_total
        },
        "licenses": licenses_data
    }


@router.get("/my/permissions")
async def get_my_permissions(
    agency: Any = Depends(get_current_v2_agency),
):
    return agency.role_permissions or {}


@router.patch("/my/permissions")
async def update_my_permissions(
    permissions: dict,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    agency.role_permissions = permissions
    await uow.session.flush()
    await uow.session.commit()
    return {"status": "success", "role_permissions": permissions}
