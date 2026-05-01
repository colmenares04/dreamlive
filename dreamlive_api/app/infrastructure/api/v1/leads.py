"""
Rutas relacionadas con Leads — Controladores "tontos".
"""
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from app.application.leads.use_cases import (
    ListLeadsUseCase, PurgeLeadsUseCase, SaveLeadUseCase, UpdateLeadStatusUseCase, DeleteLeadUseCase, PurgeLeadsByStatusUseCase, ProcessBatchLeadsUseCase
)
from app.application.leads.keywords_use_cases import (
    ListKeywordsUseCase, AddKeywordUseCase, RemoveKeywordUseCase
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
    get_delete_lead_use_case,
    get_purge_leads_by_status_use_case,
    get_list_keywords_use_case,
    get_add_keyword_use_case,
    get_remove_keyword_use_case,
    get_process_batch_leads_use_case,
)


leads_router = APIRouter(prefix="/leads", tags=["Leads"])


@leads_router.get("/")
async def list_leads(
    page: int = 1,
    page_size: int = Query(30),
    status_filter: Optional[str] = Query(None, alias="status"),
    tag: Optional[str] = Query(None),
    license_id: Optional[str] = None,
    search: Optional[str] = None,
    min_viewers: Optional[int] = None,
    min_likes: Optional[int] = None,
    current_user: AuthUser = Depends(require_agency_group),
    use_case: ListLeadsUseCase = Depends(get_list_leads_use_case),
):
    agency_id = None if current_user.role.value == "superuser" else str(current_user.agency_id)
    leads, total = await use_case.execute(
        agency_id=agency_id,
        license_id=license_id, page=page, page_size=page_size,
        status=status_filter, source=tag, search=search,
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

@leads_router.delete("/{lead_id}", dependencies=[Depends(require_agency_group)])
async def delete_lead(
    lead_id: str,
    current_user: AuthUser = Depends(require_agency_group),
    use_case: DeleteLeadUseCase = Depends(get_delete_lead_use_case),
):
    success = await use_case.execute(agency_id=str(current_user.agency_id), lead_id=lead_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead no encontrado o no autorizado")
    return {"status": "ok"}


@leads_router.post("/batch-process", dependencies=[Depends(require_agency_group)])
@leads_router.post("/batch-process/", dependencies=[Depends(require_agency_group)])
async def process_batch_leads(
    body: Dict[str, List[str]],
    current_user: AuthUser = Depends(get_current_user),
    use_case: ProcessBatchLeadsUseCase = Depends(get_process_batch_leads_use_case),
):
    license_id = current_user.license_id
    if not license_id:
        raise HTTPException(status_code=400, detail="Se requiere una licencia activa para procesar lotes")
    
    availables = body.get("availables", [])
    discarded = body.get("discarded", [])
    
    return await use_case.execute(
        license_id=license_id,
        availables=availables,
        discarded=discarded
    )


@leads_router.delete("/status/{status}", dependencies=[Depends(require_agency_group)])
async def purge_leads_by_status(
    status: str,
    license_id: Optional[str] = None,
    current_user: AuthUser = Depends(require_agency_group),
    use_case: PurgeLeadsByStatusUseCase = Depends(get_purge_leads_by_status_use_case),
):
    deleted = await use_case.execute(
        agency_id=str(current_user.agency_id),
        status=status,
        license_id=license_id
    )
    return {"status": "ok", "deleted": deleted}


# ── KEYWORDS ──────────────────────────────────────────────────────────────────
@leads_router.get("/keywords", dependencies=[Depends(require_agency_group)])
async def list_keywords(
    license_id: str,
    use_case: ListKeywordsUseCase = Depends(get_list_keywords_use_case),
):
    keywords = await use_case.execute(license_id=license_id)
    return {"items": keywords}

class AddKeywordBody(BaseModel):
    license_id: str
    term: str

@leads_router.post("/keywords", dependencies=[Depends(require_agency_group)])
async def add_keyword(
    body: AddKeywordBody,
    use_case: AddKeywordUseCase = Depends(get_add_keyword_use_case),
):
    term = await use_case.execute(license_id=body.license_id, term=body.term)
    return {"status": "ok", "term": term}

@leads_router.delete("/keywords/{term}", dependencies=[Depends(require_agency_group)])
async def remove_keyword(
    term: str,
    license_id: str,
    use_case: RemoveKeywordUseCase = Depends(get_remove_keyword_use_case),
):
    success = await use_case.execute(license_id=license_id, term=term)
    if not success:
        raise HTTPException(status_code=404, detail="Keyword no encontrada")
    return {"status": "ok"}
