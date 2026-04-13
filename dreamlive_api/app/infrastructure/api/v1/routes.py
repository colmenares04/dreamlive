"""
Rutas adaptadas para cliente Supabase (usando UUIDs en vez de integes).
  /api/v1/licenses  → Admin
  /api/v1/agencies  → Admin
  /api/v1/leads     → Owner / Agent (scope agencia)
  /api/v1/versions  → Admin / Programmer (lectura: todos)
  /api/v1/overview  → Admin / Programmer
  /api/v1/dashboard → Owner / Agent
"""
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import (
    LicenseRepository, AgencyRepository, LeadRepository, AppVersionRepository
)
from app.application.licenses.use_cases import (
    CreateLicenseUseCase, ExtendLicenseUseCase,
    ToggleLicenseUseCase, ListLicensesUseCase,
    CreateAgencyUseCase, ListAgenciesUseCase,
    PublishVersionUseCase, ActivateVersionUseCase,
    DeleteVersionUseCase, ListVersionsUseCase,
)
from app.application.leads.use_cases import (
    ListLeadsUseCase, PurgeLeadsUseCase, GetAdminOverviewUseCase,
    GetAgencyDashboardUseCase, ExportLeadsUseCase,
)
from app.core.entities.user import User
from app.infrastructure.api.deps import (
    get_current_user,
    require_admin, require_admin_or_programmer,
    require_agency_group, require_owner_or_admin,
)

# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS COMPARTIDOS
# ═══════════════════════════════════════════════════════════════════════════════
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

class AgencyOut(BaseModel):
    id: str | None
    name: str
    is_active: bool

class LeadOut(BaseModel):
    id: str | None
    username: str
    license_id: str | None
    status: str
    viewer_count: int
    likes_count: int
    source: str
    created_at: str | None

class VersionOut(BaseModel):
    id: str | None
    version_number: str
    platform: str
    file_url: str
    file_size_kb: int
    changelog: str
    tags: List[str]
    is_active: bool
    release_date: str | None

# ═══════════════════════════════════════════════════════════════════════════════
# LICENSES
# ═══════════════════════════════════════════════════════════════════════════════
licenses_router = APIRouter(prefix="/licenses", tags=["Licenses"])

class CreateLicenseBody(BaseModel):
    agency_id: str
    recruiter_name: str
    days: int
    request_limit: int = 60
    refresh_minutes: int = 1

class ExtendLicenseBody(BaseModel):
    days: int

@licenses_router.get("/", dependencies=[Depends(require_admin)])
async def list_licenses(
    status_filter: Optional[str] = Query(None, alias="status"),
    agency_id: Optional[str] = None,
    db: Client = Depends(get_db),
):
    repo = LicenseRepository(db)
    licenses = await ListLicensesUseCase(repo).execute(status=status_filter, agency_id=agency_id)
    return [
        LicenseOut(
            id=l.id, key=l.license_key, agency_id=l.agency_id,
            recruiter_name=l.recruiter_name, status="activo" if l.is_active else "inactivo",
            request_limit=l.limit_requests, refresh_minutes=l.refresh_minutes,
            expires_at=l.expiration_date.isoformat() if l.expiration_date else None,
            days_remaining=0,  # Temporalmente en 0 hasta actualizar use_cases
        ) for l in licenses
    ]

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
async def extend_license(license_id: str, body: ExtendLicenseBody, db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    lic = await ExtendLicenseUseCase(repo).execute(license_id, body.days)
    return {"expires_at": lic.expiration_date.isoformat() if lic.expiration_date else None}

@licenses_router.patch("/{license_id}/toggle", dependencies=[Depends(require_admin)])
async def toggle_license(license_id: str, db: Client = Depends(get_db)):
    repo = LicenseRepository(db)
    lic = await ToggleLicenseUseCase(repo).execute(license_id)
    return {"is_active": lic.is_active}


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCIES
# ═══════════════════════════════════════════════════════════════════════════════
agencies_router = APIRouter(prefix="/agencies", tags=["Agencies"])

class CreateAgencyBody(BaseModel):
    name: str

@agencies_router.get("/", dependencies=[Depends(require_admin_or_programmer)])
async def list_agencies(db: Client = Depends(get_db)):
    repo = AgencyRepository(db)
    agencies = await ListAgenciesUseCase(repo).execute()
    return [AgencyOut(id=a.id, name=a.name, is_active=True) for a in agencies]

@agencies_router.post("/", status_code=201, dependencies=[Depends(require_admin)])
async def create_agency(body: CreateAgencyBody, db: Client = Depends(get_db)):
    repo = AgencyRepository(db)
    try:
        agency = await CreateAgencyUseCase(repo).execute(body.name)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    return AgencyOut(id=agency.id, name=agency.name, is_active=True)


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS
# ═══════════════════════════════════════════════════════════════════════════════
leads_router = APIRouter(prefix="/leads", tags=["Leads"])

@leads_router.get("/")
async def list_leads(
    page: int = 1,
    page_size: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    license_id: Optional[str] = None,
    current_user: User = Depends(require_agency_group),
    db: Client = Depends(get_db),
):
    repo = LeadRepository(db)
    leads, total = await ListLeadsUseCase(repo).execute(
        license_id=license_id, page=page, page_size=page_size, status=status_filter,
    )
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [
            LeadOut(
                id=l.id, username=l.username, license_id=l.license_id,
                status=l.status, viewer_count=l.viewer_count, likes_count=l.likes_count,
                source=l.source,
                created_at=l.captured_at.isoformat() if getattr(l, 'captured_at', None) else None,
            ) for l in leads
        ],
    }

@leads_router.post("/purge")
async def purge_leads(
    current_user: User = Depends(require_owner_or_admin),
    db: Client = Depends(get_db),
):
    repo = LeadRepository(db)
    agency_id = None if current_user.role.value == "admin" else str(current_user.agency_id)
    result = await PurgeLeadsUseCase(repo).execute(agency_id=agency_id)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# APP VERSIONS
# ═══════════════════════════════════════════════════════════════════════════════
versions_router = APIRouter(prefix="/versions", tags=["Versions"])

class PublishVersionBody(BaseModel):
    version_number: str
    changelog: str
    tags: List[str]
    windows_url: str
    windows_size_kb: int
    macos_url: str
    macos_size_kb: int

@versions_router.get("/")
async def list_versions(
    _: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    repo = AppVersionRepository(db)
    versions = await ListVersionsUseCase(repo).execute()
    return [
        VersionOut(
            id=v.id, version_number=v.version_number, platform=v.platform,
            file_url=v.file_url, file_size_kb=v.file_size_kb, changelog=v.changelog,
            tags=v.tags, is_active=v.is_active,
            release_date=v.release_date.isoformat() if getattr(v, 'release_date', None) else None,
        ) for v in versions
    ]

@versions_router.post("/publish", status_code=201, dependencies=[Depends(require_admin_or_programmer)])
async def publish_version(body: PublishVersionBody, db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    versions = await PublishVersionUseCase(repo).execute(
        version_number=body.version_number, changelog=body.changelog, tags=body.tags,
        windows_url=body.windows_url, windows_size_kb=body.windows_size_kb,
        macos_url=body.macos_url, macos_size_kb=body.macos_size_kb,
    )
    return {"published": len(versions), "version": body.version_number}

@versions_router.patch("/{version_id}/activate", dependencies=[Depends(require_admin_or_programmer)])
async def activate_version(version_id: str, db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    await ActivateVersionUseCase(repo).execute(version_id)
    return {"ok": True}

@versions_router.delete("/{version_id}", dependencies=[Depends(require_admin_or_programmer)])
async def delete_version(version_id: str, db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    await DeleteVersionUseCase(repo).execute(version_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# OVERVIEW & DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
overview_router = APIRouter(prefix="/overview", tags=["Overview"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@overview_router.get("/", dependencies=[Depends(require_admin_or_programmer)])
async def get_overview(db: Client = Depends(get_db)):
    return await GetAdminOverviewUseCase(LeadRepository(db), LicenseRepository(db), AgencyRepository(db)).execute()

@dashboard_router.get("/")
async def get_dashboard(current_user: User = Depends(require_agency_group), db: Client = Depends(get_db)):
    return await GetAgencyDashboardUseCase(LeadRepository(db), LicenseRepository(db)).execute(str(current_user.agency_id))
