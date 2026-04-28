"""
Rutas relacionadas con Agencias (extraídas de routes.py).
"""
from app.infrastructure.api.deps import require_agency_group
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import AgencyRepository, LicenseRepository, LeadRepository, UserRepository
from app.application.licenses.use_cases import (
    CreateAgencyUseCase, ListAgenciesUseCase,
    GetAgencyStatsUseCase, DeleteAgencyUseCase,
)
from app.infrastructure.api.deps import require_admin, require_owner_or_admin, get_current_user
from app.core.entities.user import User


agencies_router = APIRouter(prefix="/agencies", tags=["Agencies"])


class AgencyOut(BaseModel):
    id: str | None
    name: str
    is_active: bool


@agencies_router.get("/", dependencies=[Depends(require_agency_group)])
async def list_agencies(db: Client = Depends(get_db)):
    repo = AgencyRepository(db)
    agencies = await ListAgenciesUseCase(repo).execute()
    return [AgencyOut(id=a.id, name=a.name, is_active=True) for a in agencies]


class ConfirmDeleteAgencyBody(BaseModel):
    password: str


@agencies_router.delete("/{agency_id}", dependencies=[Depends(require_admin)])
async def delete_agency(
    agency_id: str,
    body: ConfirmDeleteAgencyBody,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    repo = AgencyRepository(db)
    user_repo = UserRepository(db)
    try:
        await DeleteAgencyUseCase(repo, user_repo).execute(
            agency_id=agency_id,
            admin_user_id=str(current_user.id),
            password=body.password
        )
    except ValueError as e:
        raise HTTPException(401, detail=str(e))
    return {"status": "deleted"}


@agencies_router.get("/{agency_id}/stats", dependencies=[Depends(require_admin)])
async def get_agency_stats(agency_id: str, db: Client = Depends(get_db)):
    repo = AgencyRepository(db)
    lic_repo = LicenseRepository(db)
    lead_repo = LeadRepository(db)
    try:
        stats = await GetAgencyStatsUseCase(repo, lic_repo, lead_repo).execute(agency_id)
        return stats
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


# ─── Gestión de Permisos Dinámicos ───────────────────────────────────────────

@agencies_router.get("/my/permissions")
async def get_my_permissions(
    current_user: User = Depends(require_agency_group),
    db: Client = Depends(get_db)
):
    """Retorna la configuración de permisos de la agencia actual."""
    if not current_user.agency_id:
        raise HTTPException(400, detail="El usuario no pertenece a una agencia")
    
    repo = AgencyRepository(db)
    agency = await repo.get_by_id(str(current_user.agency_id))
    if not agency:
        raise HTTPException(404, detail="Agencia no encontrada")
    
    return agency.role_permissions


@agencies_router.patch("/my/permissions")
async def update_my_permissions(
    permissions: dict,
    current_user: User = Depends(require_owner_or_admin),
    db: Client = Depends(get_db)
):
    """Actualiza la configuración de permisos de la agencia actual."""
    if not current_user.agency_id:
        raise HTTPException(400, detail="El usuario no pertenece a una agencia")
    
    repo = AgencyRepository(db)
    agency = await repo.get_by_id(str(current_user.agency_id))
    if not agency:
        raise HTTPException(404, detail="Agencia no encontrada")
    
    # Actualizar permisos
    agency.role_permissions = permissions
    await repo.update(agency)
    
    return {"status": "updated", "role_permissions": agency.role_permissions}
