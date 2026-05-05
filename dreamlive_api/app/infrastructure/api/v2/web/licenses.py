from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid
from datetime import datetime, timedelta, timezone

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency, bearer_scheme
from app.adapters.db.models import LicenseORM, LeadORM
from app.adapters.security.handlers import hash_password
from app.infrastructure.api.v2.web.audit_helper import create_audit_log
from fastapi import Request

router = APIRouter(prefix="/licenses", tags=["Licenses Web V2"])

class LicenseOut(BaseModel):
    id: str
    key: str
    recruiter_name: str
    status: str
    is_active: bool
    expires_at: Optional[datetime] = None
    agency_id: str | None = None
    days_remaining: int = 0
    request_limit: int = 60
    refresh_minutes: int = 60
    admin_password: Optional[str] = None
    keywords: Optional[str] = None

class CreateLicenseRequest(BaseModel):
    agency_id: str
    recruiter_name: Optional[str] = "Agente"
    days: int
    quantity: Optional[int] = 1
    request_limit: Optional[int] = 60
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
    credentials: Any = Depends(bearer_scheme),
):
    from sqlalchemy import select
    from app.adapters.security.handlers import decode_token_func
    
    # Obtener el rol del token
    role = "agent"
    if credentials and credentials.credentials:
        try:
            token_data = decode_token_func(credentials.credentials)
            role = token_data.get("role", "agent").lower()
        except: pass

    stmt = select(LicenseORM)
    
    # Si es superuser y no pide una agencia específica, mostramos TODO
    if role == "superuser" and not agency_id:
        pass
    else:
        # Para otros roles o si se especifica agencia, filtramos
        target_agency_id = agency_id if agency_id else str(agency.id)
        stmt = stmt.where(LicenseORM.agency_id == target_agency_id)
    
    if status == "active":
        stmt = stmt.where(LicenseORM.is_active == True)
    elif status == "inactive":
        stmt = stmt.where(LicenseORM.is_active == False)
        
    res = await uow.session.execute(stmt)
    licenses = res.scalars().all()
    
    now = datetime.now(timezone.utc)
    def get_status(l):
        if not l.expires_at: return "active" if l.is_active else "inactive"
        if l.expires_at < now: return "expired"
        return "active" if l.is_active else "inactive"

    return [
        LicenseOut(
            id=str(l.id),
            key=l.key,
            recruiter_name=l.recruiter_name or "",
            status=get_status(l),
            is_active=l.is_active,
            expires_at=l.expires_at,
            agency_id=str(l.agency_id) if l.agency_id else None,
            days_remaining=(l.expires_at - now).days if l.expires_at else 0,
            request_limit=l.request_limit or 60,
            refresh_minutes=l.refresh_minutes or 60,
            admin_password=l.admin_password,
            keywords=l.keywords
        ) for l in licenses
    ]

@router.post("/", response_model=Any)
async def create_license(
    payload: CreateLicenseRequest,
    uow: Any = Depends(get_uow),
):
    created_keys = []
    qty = max(1, min(payload.quantity or 1, 100)) # Limitar a 100 por seguridad
    
    # Enforce minimum 30 days
    days = max(30, payload.days)
    
    for _ in range(qty):
        lic_id = str(uuid.uuid4())
        lic_key = f"DL-{str(uuid.uuid4())[:8].upper()}"
        
        new_license = LicenseORM(
            id=lic_id,
            key=lic_key,
            agency_id=payload.agency_id,
            recruiter_name=payload.recruiter_name or "Agente",
            is_active=True,
            expires_at=datetime.now(timezone.utc) + timedelta(days=payload.days),
            request_limit=payload.request_limit,
            refresh_minutes=payload.refresh_minutes,
            keywords="",
        )
        uow.session.add(new_license)
        created_keys.append({"id": lic_id, "key": lic_key})
        
    await uow.session.flush()
    await uow.session.commit()
    
    await create_audit_log(
        uow=uow,
        category="LICENSE",
        action=f"Creación masiva de {qty} licencias",
        entity_name="License",
        agency_id=payload.agency_id
    )
    await uow.session.commit()
    
    return {
        "count": qty,
        "licenses": created_keys
    }

@router.post("/sync-passwords")
async def sync_passwords(
    payload: dict,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import update
    password = payload.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")
        
    stmt = update(LicenseORM).where(LicenseORM.agency_id == str(agency.id)).values(admin_password=password)
    res = await uow.session.execute(stmt)
    await uow.session.commit()
    return {"updated_count": res.rowcount}

@router.patch("/{license_id}/extend")
async def extend_license(
    license_id: str,
    payload: dict,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    days = payload.get("days", 0)
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    if not lic.expires_at:
        lic.expires_at = datetime.now(timezone.utc)
        
    lic.expires_at += timedelta(days=days)
    
    await create_audit_log(
        uow=uow,
        category="LICENSE",
        action=f"Extensión de licencia (+{days} días)",
        entity_name="License",
        entity_id=license_id,
        agency_id=str(lic.agency_id) if lic.agency_id else None
    )
    await uow.session.commit()
    
    remaining = (lic.expires_at - datetime.now(timezone.utc)).days
    return {"expires_at": lic.expires_at.isoformat(), "days_remaining": remaining}

@router.patch("/{license_id}/date")
async def update_license_date(
    license_id: str,
    payload: dict,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    new_date_str = payload.get("new_date")
    if not new_date_str:
        raise HTTPException(status_code=400, detail="Fecha requerida")
        
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    old_date = lic.expires_at.isoformat() if lic.expires_at else "None"
    lic.expires_at = datetime.fromisoformat(new_date_str.replace("Z", "+00:00"))
    
    await create_audit_log(
        uow=uow,
        category="LICENSE",
        action=f"Cambio manual de fecha: {old_date} -> {new_date_str}",
        entity_name="License",
        entity_id=license_id,
        agency_id=str(lic.agency_id) if lic.agency_id else None
    )
    await uow.session.commit()
    return {"status": "ok", "expires_at": lic.expires_at.isoformat()}

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
    
    await create_audit_log(
        uow=uow,
        category="LICENSE",
        action=f"Toggle de estado: {'Activada' if lic.is_active else 'Desactivada'}",
        entity_name="License",
        entity_id=license_id,
        agency_id=str(lic.agency_id) if lic.agency_id else None
    )
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
