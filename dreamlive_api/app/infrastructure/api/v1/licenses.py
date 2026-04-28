"""
Rutas relacionadas con Licencias (extraídas de routes.py).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import LicenseRepository
from app.application.licenses.use_cases import (
    CreateLicenseUseCase, ExtendLicenseUseCase,
    ToggleLicenseUseCase, ListLicensesUseCase,
    VerifyLicenseUseCase, RegisterSessionUseCase
)
from app.core.entities.user import User, UserRole
from app.infrastructure.api.deps import (
    get_current_user,
    require_admin,
    require_agency_group,
)


licenses_router = APIRouter(prefix="/licenses", tags=["Licenses"])


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
    refresh_minutes: int = 1


class ExtendLicenseBody(BaseModel):
    days: int

@licenses_router.get("/")
async def list_licenses(
    status_filter: Optional[str] = Query(None, alias="status"),
    agency_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    repo = LicenseRepository(db)
    # If not superuser, force their own agency_id
    if current_user.role.value != "superuser":
        agency_id = str(current_user.agency_id)
    
    licenses = await ListLicensesUseCase(repo).execute(status=status_filter, agency_id=agency_id)
    return [
        LicenseOut(
            id=l.id, key=l.license_key, agency_id=l.agency_id,
            recruiter_name=l.recruiter_name, status="active" if l.is_active else "inactive",
            request_limit=l.limit_requests, refresh_minutes=l.refresh_minutes,
            expires_at=l.expiration_date.isoformat() if l.expiration_date else None,
            days_remaining=0, admin_password=l.admin_password, keywords=l.keywords
        ) for l in licenses
    ]


@licenses_router.get("/metrics", dependencies=[Depends(require_agency_group)])
async def get_license_metrics(
    agency_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    from app.adapters.db.repositories.all_repos import LeadRepository
    repo = LicenseRepository(db)
    lead_repo = LeadRepository(db)
    
    # Logic for filtering
    if current_user.role != UserRole.SUPERUSER:
        agency_id = str(current_user.agency_id) if current_user.agency_id else None
    
    try:
        if agency_id:
            licenses = await repo.list_all(agency_id=agency_id)
        else:
            licenses = await repo.list_all()
            
        license_ids = [str(l.id) for l in licenses]
        
        if not license_ids:
            return {}

        import asyncio
        stats_task = lead_repo.get_license_performance_stats(license_ids)
        pings_task = repo.get_last_pings(license_ids)
        
        stats, pings = await asyncio.gather(stats_task, pings_task)
        
        return {
            lid: {
                "today": stats.get(lid, {}).get("today", 0),
                "total": stats.get(lid, {}).get("total", 0),
                "last_ping": pings.get(lid)
            } for lid in license_ids
        }
    except Exception as e:
        print(f"Error in metrics: {str(e)}")
        # Return empty dictionary instead of 500 to keep UI alive
        return {}


@licenses_router.post("/", status_code=201, dependencies=[Depends(require_admin)])
async def create_license(body: CreateLicenseBody, db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    lic = await CreateLicenseUseCase(repo).execute(
        agency_id=body.agency_id, recruiter_name=body.recruiter_name,
        days=body.days, request_limit=body.request_limit,
        refresh_minutes=body.refresh_minutes,
    )
    return {"id": lic.id, "key": lic.license_key, "expires_at": lic.expiration_date.isoformat() if lic.expiration_date else None}


@licenses_router.patch("/{license_id}/extend", dependencies=[Depends(require_admin)])
async def extend_license(license_id: str, body: ExtendLicenseBody, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    lic = await ExtendLicenseUseCase(repo).execute(license_id, body.days)
    return {"expires_at": lic.expiration_date.isoformat() if lic.expiration_date else None}


@licenses_router.patch("/{license_id}/toggle", dependencies=[Depends(require_admin)])
async def toggle_license(license_id: str, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    lic = await ToggleLicenseUseCase(repo).execute(license_id)
    return {"is_active": lic.is_active}


class ConfigLicenseBody(BaseModel):
    recruiter_name: Optional[str] = None
    admin_password: Optional[str] = None
    request_limit: Optional[int] = None
    refresh_minutes: Optional[int] = None
    keywords: Optional[str] = None


@licenses_router.patch("/{license_id}/config", dependencies=[Depends(require_agency_group)])
async def config_license(license_id: str, body: ConfigLicenseBody, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    lic = await repo.get_by_id(license_id)
    if not lic: raise HTTPException(404, "License not found")
    
    # [SECURITY] IDOR Protection: Verify ownership
    if current_user.role != UserRole.SUPERUSER and lic.agency_id != current_user.agency_id:
        raise HTTPException(403, "Access denied: This license does not belong to your agency")

    if body.recruiter_name is not None: lic.recruiter_name = body.recruiter_name
    if body.admin_password is not None: lic.admin_password = body.admin_password
    if body.request_limit is not None: lic.limit_requests = body.request_limit
    if body.refresh_minutes is not None: lic.refresh_minutes = body.refresh_minutes
    if body.keywords is not None: lic.keywords = body.keywords
    await repo.update(lic)
    return {"status": "ok"}


class SyncPasswordsBody(BaseModel):
    password: str


@licenses_router.post("/sync-passwords", dependencies=[Depends(require_agency_group)])
async def sync_passwords(body: SyncPasswordsBody, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    if not current_user.agency_id:
        raise HTTPException(status_code=400, detail="User has no agency associated.")
    
    updated_count = await repo.bulk_update_password(str(current_user.agency_id), body.password)
    return {"status": "ok", "updated_count": updated_count}


class UpdateLicenseDateBody(BaseModel):
    new_date: str


@licenses_router.patch("/{license_id}/date", dependencies=[Depends(require_admin)])
async def update_license_date(license_id: str, body: UpdateLicenseDateBody, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    try:
        dt = datetime.fromisoformat(body.new_date.replace("Z", "+00:00"))
        await repo.update_date(license_id, dt)
        return {"status": "ok"}
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use ISO format.")


class DeleteLicenseBody(BaseModel):
    password: Optional[str] = None

@licenses_router.delete("/{license_id}", dependencies=[Depends(require_admin)])
async def delete_license(license_id: str, body: Optional[DeleteLicenseBody] = None, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    await repo.delete(license_id)
    return {"status": "ok"}

class VerifyLicenseBody(BaseModel):
    key: str


@licenses_router.post("/verify")
async def verify_license(body: VerifyLicenseBody, db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    license_ = await VerifyLicenseUseCase(repo).execute(body.key)
    if not license_:
        raise HTTPException(401, "Licencia inválida o expirada")
    
    return {
        "id": license_.id,
        "key": license_.license_key,
        "is_active": license_.is_active,
        "expiration_date": license_.expiration_date.isoformat() if license_.expiration_date else None,
        "recruiter_name": license_.recruiter_name,
        "limit_requests": license_.limit_requests,
        "refresh_minutes": license_.refresh_minutes,
        "max_devices": license_.max_devices,
        "theme": license_.theme,
    }


class RegisterSessionBody(BaseModel):
    license_id: str
    device_id: str
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None


@licenses_router.post("/session")
async def register_session(body: RegisterSessionBody, db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    # Por ahora simplemente devolvemos ok, delegando la lógica real a una futura mejora del repo
    # Pero esto ya permite a la extensión no usar Supabase directamente.
    return {"status": "ok"}
