"""
Rutas relacionadas con Leads — Controladores "tontos".
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from app.application.leads.use_cases import (
    ListLeadsUseCase, PurgeLeadsUseCase, SaveLeadUseCase, UpdateLeadStatusUseCase,
)
from app.infrastructure.api.deps import AuthUser
from app.infrastructure.api.deps import (
    get_current_user, require_agency_group, require_owner_or_admin,
)
from app.infrastructure.api.providers import (
    get_list_leads_use_case,
    get_purge_leads_use_case,
    get_save_lead_use_case,
    get_update_lead_status_use_case,
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
    current_user: AuthUser = Depends(require_agency_group),
    use_case: ListLeadsUseCase = Depends(get_list_leads_use_case),
):
    leads, total = await use_case.execute(
        agency_id=str(current_user.agency_id),
        license_id=license_id, page=page, page_size=page_size,
        status=status_filter, search=search,
        min_viewers=min_viewers, min_likes=min_likes,
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
                "created_at": l.captured_at.isoformat() if getattr(l, "captured_at", None) else None,
            } for l in leads
        ],
    }


@leads_router.post("/purge")
async def purge_leads(
    current_user: AuthUser = Depends(require_owner_or_admin),
    use_case: PurgeLeadsUseCase = Depends(get_purge_leads_use_case),
):
    agency_id = None if current_user.role.value == "superuser" else str(current_user.agency_id)
    return await use_case.execute(agency_id=agency_id)


class SaveLeadBody(BaseModel):
    license_id: str
    username: str
    viewer_count: int = 0
    likes_count: int = 0
    source: str = "unknown"


@leads_router.post("/")
async def save_lead(
    body: SaveLeadBody,
    use_case: SaveLeadUseCase = Depends(get_save_lead_use_case),
):
    lead = await use_case.execute(
        license_id=body.license_id,
        username=body.username,
        viewer_count=body.viewer_count,
        likes_count=body.likes_count,
        source=body.source,
    )
    return {"status": "ok", "id": lead.id}


class UpdateLeadStatusBody(BaseModel):
    license_id: str
    username: str
    status: str


@leads_router.patch("/status", dependencies=[Depends(require_agency_group)])
async def update_lead_status(
    body: UpdateLeadStatusBody,
    use_case: UpdateLeadStatusUseCase = Depends(get_update_lead_status_use_case),
):
    success = await use_case.execute(
        license_id=body.license_id,
        username=body.username,
        new_status=body.status
    )
    if not success:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {"status": "ok"}
