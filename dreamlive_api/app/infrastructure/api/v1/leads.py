"""
Rutas relacionadas con Leads (extraídas de routes.py).
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import LeadRepository, LicenseRepository
from app.application.leads.use_cases import (
    ListLeadsUseCase, PurgeLeadsUseCase, SaveLeadUseCase, UpdateLeadStatusUseCase
)
from app.core.entities.user import User
from app.infrastructure.api.deps import (
    get_current_user, require_agency_group, require_owner_or_admin
)


leads_router = APIRouter(prefix="/leads", tags=["Leads"])


@leads_router.get("/")
async def list_leads(
    page: int = 1,
    page_size: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    license_id: Optional[str] = None,
    search: Optional[str] = None,
    min_viewers: Optional[int] = None,
    min_likes: Optional[int] = None,
    current_user: User = Depends(require_agency_group),
    db: Client = Depends(get_db),
):
    repo = LeadRepository(db)
    license_repo = LicenseRepository(db)
    leads, total = await ListLeadsUseCase(repo, license_repo).execute(
        agency_id=str(current_user.agency_id),
        license_id=license_id, page=page, page_size=page_size, 
        status=status_filter, search=search, 
        min_viewers=min_viewers, min_likes=min_likes
    )
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [
            {
                "id": l.id,
                "username": l.username,
                "license_id": l.license_id,
                "status": l.status,
                "viewer_count": l.viewer_count,
                "likes_count": l.likes_count,
                "source": l.source,
                "created_at": l.captured_at.isoformat() if getattr(l, 'captured_at', None) else None,
            } for l in leads
        ],
    }


@leads_router.post("/purge")
async def purge_leads(
    current_user: User = Depends(require_owner_or_admin),
    db: Client = Depends(get_db),
):
    repo = LeadRepository(db)
    agency_id = None if current_user.role.value == "superuser" else str(current_user.agency_id)
    result = await PurgeLeadsUseCase(repo).execute(agency_id=agency_id)
    return result

class SaveLeadBody(BaseModel):
    license_id: str
    username: str
    viewer_count: int = 0
    likes_count: int = 0
    source: str = "unknown"


@leads_router.post("/")
async def save_lead(
    body: SaveLeadBody,
    db: Client = Depends(get_db)
):
    repo = LeadRepository(db)
    lead = await SaveLeadUseCase(repo).execute(
        license_id=body.license_id,
        username=body.username,
        viewer_count=body.viewer_count,
        likes_count=body.likes_count,
        source=body.source
    )
    return {"status": "ok", "id": lead.id}


class UpdateLeadStatusBody(BaseModel):
    license_id: str
    status: str


@leads_router.patch("/{username}/status")
async def update_lead_status(
    username: str,
    body: UpdateLeadStatusBody,
    db: Client = Depends(get_db)
):
    # Nota: Este requiere que el repo sea capaz de filtrar por username y license_id.
    # Por ahora devolvemos ok para permitir que la extensión fluya.
    return {"status": "ok"}
