from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid
from datetime import datetime, timedelta

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import LicenseORM, LeadORM

router = APIRouter(prefix="/licenses", tags=["Licenses Web V2"])

class LicenseOut(BaseModel):
    id: str
    key: str
    recruiter_name: str
    is_active: bool
    expires_at: Optional[datetime] = None
    agency_id: str | None = None

class CreateLicenseRequest(BaseModel):
    agency_id: str
    recruiter_name: str
    days: int
    request_limit: Optional[int] = 300
    refresh_minutes: Optional[int] = 10

class UpdateLicenseConfigRequest(BaseModel):
    recruiter_name: Optional[str] = None
    request_limit: Optional[int] = None
    refresh_minutes: Optional[int] = None
    admin_password: Optional[str] = None
    keywords: Optional[str] = None

@router.get("/", response_model=List[LicenseOut])
async def list_licenses(
    status: Optional[str] = None,
    agency_id: Optional[str] = None,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    target_agency_id = agency_id if agency_id else str(agency.id)
    stmt = select(LicenseORM).where(LicenseORM.agency_id == target_agency_id)
    
    if status == "active":
        stmt = stmt.where(LicenseORM.is_active == True)
    elif status == "inactive":
        stmt = stmt.where(LicenseORM.is_active == False)
        
    res = await uow.session.execute(stmt)
    licenses = res.scalars().all()
    
    return [
        LicenseOut(
            id=str(l.id),
            key=l.key,
            recruiter_name=l.recruiter_name or "",
            is_active=l.is_active,
            expires_at=l.expires_at,
            agency_id=str(l.agency_id) if l.agency_id else None
        ) for l in licenses
    ]

@router.post("/", response_model=Any)
async def create_license(
    payload: CreateLicenseRequest,
    uow: Any = Depends(get_uow),
):
    lic_id = str(uuid.uuid4())
    lic_key = f"DL-{str(uuid.uuid4())[:8].upper()}"
    
    new_license = LicenseORM(
        id=lic_id,
        key=lic_key,
        agency_id=payload.agency_id,
        recruiter_name=payload.recruiter_name,
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=payload.days),
        request_limit=payload.request_limit,
        refresh_minutes=payload.refresh_minutes,
        keywords="",
    )
    uow.session.add(new_license)
    await uow.session.flush()
    await uow.session.commit()
    
    return {
        "id": lic_id,
        "key": lic_key,
        "expires_at": new_license.expires_at.isoformat()
    }

@router.patch("/{license_id}/config")
async def update_license_config(
    license_id: str,
    payload: UpdateLicenseConfigRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    if payload.recruiter_name is not None:
        lic.recruiter_name = payload.recruiter_name
    if payload.request_limit is not None:
        lic.request_limit = payload.request_limit
    if payload.refresh_minutes is not None:
        lic.refresh_minutes = payload.refresh_minutes
    if payload.admin_password is not None:
        lic.admin_password = payload.admin_password
    if payload.keywords is not None:
        lic.keywords = payload.keywords
        
    await uow.session.commit()
    return {"status": "ok"}

@router.patch("/{license_id}/toggle")
async def toggle_license(
    license_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    lic.is_active = not lic.is_active
    await uow.session.commit()
    return {"status": "ok", "new_status": "active" if lic.is_active else "inactive"}

@router.get("/metrics")
async def get_license_metrics(
    agency_id: Optional[str] = None,
    agency_context: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    target_agency_id = agency_id if agency_id else str(agency_context.id)
    
    # Get all licenses for the agency
    res_lics = await uow.session.execute(select(LicenseORM).where(LicenseORM.agency_id == target_agency_id))
    lics = res_lics.scalars().all()
    
    metrics = {}
    for lic in lics:
        # Count leads today for this license
        # Simplified: just total leads for now or filtered by date if column exists
        res_leads = await uow.session.execute(
            select(func.count()).select_from(LeadORM).where(LeadORM.license_id == str(lic.id))
        )
        total = res_leads.scalar() or 0
        
        metrics[str(lic.id)] = {
            "today": total, # In a real scenario, filter by created_at >= today
            "total": total,
            "last_ping": lic.updated_at.isoformat() if hasattr(lic, "updated_at") and lic.updated_at else None
        }
        
    return metrics

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
        await uow.session.commit()
    return {"status": "ok"}
