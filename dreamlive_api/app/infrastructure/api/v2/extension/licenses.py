from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
import uuid

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import LicenseORM, AgencyORM

router = APIRouter(prefix="/licenses", tags=["Licenses V2"])


class LicenseOut(BaseModel):
    id: str | None
    key: str
    agency_id: str | None
    recruiter_name: str
    status: str
    request_limit: int
    refresh_minutes: int
    expires_at: str | None
    days_remaining: int
    admin_password: str
    keywords: str


class CreateLicenseBody(BaseModel):
    agency_id: str
    recruiter_name: str
    days: int
    request_limit: int = 60
    refresh_minutes: int = 60


class ConfigLicenseBody(BaseModel):
    recruiter_name: Optional[str] = None
    admin_password: Optional[str] = None
    request_limit: Optional[int] = None
    refresh_minutes: Optional[int] = None
    keywords: Optional[str] = None
    message_templates: Optional[List[str]] = None
    invitation_types: Optional[List[str]] = None


@router.get("/unassigned")
async def list_unassigned_licenses(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, or_
    stmt = select(LicenseORM).where(
        LicenseORM.agency_id == str(agency.id),
        or_(
            LicenseORM.email == None,
            LicenseORM.email == "",
            LicenseORM.admin_password == None,
            LicenseORM.admin_password == ""
        )
    )
    res = await uow.session.execute(stmt)
    lics = res.scalars().all()
    
    return [
        {
            "id": str(l.id),
            "key": l.key,
            "recruiter_name": l.recruiter_name,
        } for l in lics
    ]


@router.get("/", response_model=List[LicenseOut])
async def list_licenses(
    request: Request,
    agency: Any = Depends(get_current_v2_agency),
    agency_id: Optional[str] = Query(None),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.security.handlers import decode_token_func

    is_superuser = False
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_token_func(token)
            role_val = str(payload.get("role", "")).lower()
            extra_role_val = str(payload.get("extra", {}).get("role", "")).lower()
            if role_val == "superuser" or extra_role_val == "superuser":
                is_superuser = True
        except:
            pass

    if agency_id:
        stmt = select(LicenseORM).where(LicenseORM.agency_id == str(agency_id))
    elif is_superuser:
        stmt = select(LicenseORM)
    else:
        stmt = select(LicenseORM).where(LicenseORM.agency_id == str(agency.id))

    result = await uow.session.execute(stmt)
    licenses = result.scalars().all()

    return [
        LicenseOut(
            id=str(l.id),
            key=l.key or "",
            agency_id=str(l.agency_id) if l.agency_id else None,
            recruiter_name=l.recruiter_name or "",
            status="active" if l.is_active else "inactive",
            request_limit=l.request_limit or 60,
            refresh_minutes=l.refresh_minutes or 1,
            expires_at=l.expires_at.isoformat() if hasattr(l.expires_at, "isoformat") and l.expires_at else None,
            days_remaining=0,
            admin_password=l.admin_password or "",
            keywords=l.keywords or "",
        ) for l in licenses
    ]


@router.get("/metrics")
async def get_license_metrics(
    request: Request,
    agency: Any = Depends(get_current_v2_agency),
    agency_id: Optional[str] = Query(None),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.security.handlers import decode_token_func

    is_superuser = False
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_token_func(token)
            if payload.get("role") == "superuser" or payload.get("extra", {}).get("role") == "superuser":
                is_superuser = True
        except:
            pass

    if agency_id:
        stmt = select(LicenseORM).where(LicenseORM.agency_id == str(agency_id))
    elif is_superuser:
        stmt = select(LicenseORM)
    else:
        stmt = select(LicenseORM).where(LicenseORM.agency_id == str(agency.id))

    from app.adapters.db.models import LeadORM
    from sqlalchemy import func

    result = await uow.session.execute(stmt)
    licenses = result.scalars().all()
    lic_ids = [str(l.id) for l in licenses]
    
    # Contar leads por estado para todas las licencias de la agencia de una sola vez
    leads_stmt = select(
        LeadORM.license_id, 
        LeadORM.status, 
        func.count(LeadORM.id)
    ).where(LeadORM.license_id.in_(lic_ids)).group_by(LeadORM.license_id, LeadORM.status)
    
    leads_res = await uow.session.execute(leads_stmt)
    leads_counts = leads_res.all()
    
    # Organizar conteos por licencia
    counts_map = {}
    for lid, status, count in leads_counts:
        if lid not in counts_map:
            counts_map[lid] = {"collected": 0, "available": 0, "contacted": 0}
        
        if status == 'recopilado': counts_map[lid]["collected"] = count
        elif status == 'disponible': counts_map[lid]["available"] = count
        elif status == 'contactado': counts_map[lid]["contacted"] = count

    metrics = {}
    for l in licenses:
        l_id = str(l.id)
        l_counts = counts_map.get(l_id, {"collected": 0, "available": 0, "contacted": 0})
        metrics[l_id] = {
            "today": l.daily_contact_count or 0,
            "total": l.daily_contact_count or 0,
            "collected": l_counts["collected"],
            "available": l_counts["available"],
            "contacted": l_counts["contacted"],
            "last_ping": datetime.now(timezone.utc).isoformat(),
        }
    return metrics


@router.post("/", status_code=201)
async def create_license(
    body: CreateLicenseBody,
    uow: Any = Depends(get_uow),
):
    import uuid
    from datetime import datetime, timedelta, timezone

    lic_id = str(uuid.uuid4())
    key = str(uuid.uuid4())[:8].upper()
    expires = datetime.now(timezone.utc) + timedelta(days=body.days)

    new_license = LicenseORM(
        id=lic_id,
        key=key,
        agency_id=body.agency_id,
        recruiter_name=body.recruiter_name,
        request_limit=body.request_limit,
        refresh_minutes=body.refresh_minutes or 1,
        is_active=True,
        expires_at=expires,
        admin_password="",
        keywords="",
    )
    uow.session.add(new_license)
    await uow.session.flush()
    await uow.session.commit()
    
    return {"id": lic_id, "key": key, "expires_at": expires.isoformat()}


@router.get("/templates")
async def get_license_templates(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    # En V2 el agency_id del token es el de la licencia (si se logueó con licencia)
    # o el de la agencia (si se logueó como admin)
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == str(agency.id)))
    lic = res.scalar_one_or_none()
    
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    return {
        "message_templates": lic.message_templates or [],
        "invitation_types": lic.invitation_types or []
    }


@router.post("/templates")
async def update_license_templates(
    body: ConfigLicenseBody,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == str(agency.id)))
    lic = res.scalar_one_or_none()
    
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    if body.message_templates is not None:
        lic.message_templates = body.message_templates
    if body.invitation_types is not None:
        lic.invitation_types = body.invitation_types

    await uow.session.flush()
    await uow.session.commit()
    return {"status": "ok"}


class ExtendLicenseBody(BaseModel):
    days: int


@router.patch("/{license_id}/extend")
async def extend_license(
    license_id: str,
    body: ExtendLicenseBody,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")
        
    if lic.expires_at:
        lic.expires_at = lic.expires_at + timedelta(days=body.days)
    else:
        lic.expires_at = datetime.now(timezone.utc) + timedelta(days=body.days)
        
    await uow.session.flush()
    await uow.session.commit()
    return {"expires_at": lic.expires_at.isoformat()}


@router.patch("/{license_id}/toggle")
async def toggle_license(
    license_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    lic.is_active = not lic.is_active
    await uow.session.flush()
    await uow.session.commit()
    return {"is_active": lic.is_active}


@router.patch("/{license_id}/config")
async def config_license(
    license_id: str,
    body: ConfigLicenseBody,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    if body.recruiter_name is not None:
        lic.recruiter_name = body.recruiter_name
    if body.admin_password is not None:
        lic.admin_password = body.admin_password
    if body.request_limit is not None:
        lic.request_limit = body.request_limit
    if body.refresh_minutes is not None:
        lic.refresh_minutes = body.refresh_minutes
    if body.keywords is not None:
        lic.keywords = body.keywords

    await uow.session.flush()
    await uow.session.commit()
    return {"status": "ok"}


class SyncPasswordsBody(BaseModel):
    password: str


@router.post("/sync-passwords")
async def sync_passwords(
    body: SyncPasswordsBody,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, update
    
    stmt = update(LicenseORM).where(LicenseORM.agency_id == str(agency.id)).values(admin_password=body.password)
    res = await uow.session.execute(stmt)
    await uow.session.flush()
    await uow.session.commit()
    return {"status": "ok", "updated_count": res.rowcount}


class UpdateLicenseDateBody(BaseModel):
    new_date: str


@router.patch("/{license_id}/date")
async def update_license_date(
    license_id: str,
    body: UpdateLicenseDateBody,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    try:
        dt = datetime.fromisoformat(body.new_date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido.")

    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")
        
    lic.expires_at = dt
    await uow.session.flush()
    await uow.session.commit()
    return {"status": "ok"}


@router.delete("/{license_id}")
async def delete_license(
    license_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if lic:
        await uow.session.delete(lic)
        await uow.session.flush()
        await uow.session.commit()
    return {"status": "ok"}
