"""
Rutas relacionadas con Agencias — Controladores "tontos".
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.application.licenses.use_cases import (
    ListAgenciesUseCase, GetAgencyStatsUseCase, DeleteAgencyUseCase,
    GetAgencyPermissionsUseCase, UpdateAgencyPermissionsUseCase,
)
from app.infrastructure.api.deps import require_admin, require_owner_or_admin, require_agency_group
from app.infrastructure.api.providers import (
    get_list_agencies_use_case,
    get_delete_agency_use_case,
    get_agency_stats_use_case,
    get_get_agency_permissions_use_case,
    get_update_agency_permissions_use_case,
)
from app.core.entities.user import User


agencies_router = APIRouter(prefix="/agencies", tags=["Agencies"])


class AgencyOut(BaseModel):
    id: str | None
    name: str
    is_active: bool


@agencies_router.get("/", dependencies=[Depends(require_agency_group)])
async def list_agencies(
    use_case: ListAgenciesUseCase = Depends(get_list_agencies_use_case),
):
    agencies = await use_case.execute()
    return [AgencyOut(id=a.id, name=a.name, is_active=True) for a in agencies]


class ConfirmDeleteAgencyBody(BaseModel):
    password: str


@agencies_router.delete("/{agency_id}", dependencies=[Depends(require_admin)])
async def delete_agency(
    agency_id: str,
    body: ConfirmDeleteAgencyBody,
    current_user: User = Depends(require_admin), # Ya requiere admin por dependencias
    use_case: DeleteAgencyUseCase = Depends(get_delete_agency_use_case),
):
    await use_case.execute(
        agency_id=agency_id,
        admin_user_id=str(current_user.id),
        password=body.password,
    )
    return {"status": "deleted"}


@agencies_router.get("/{agency_id}/stats", dependencies=[Depends(require_admin)])
async def get_agency_stats(
    agency_id: str,
    use_case: GetAgencyStatsUseCase = Depends(get_agency_stats_use_case),
):
    return await use_case.execute(agency_id)


# ─── Gestión de Permisos Dinámicos ───────────────────────────────────────────

@agencies_router.get("/my/permissions")
async def get_my_permissions(
    current_user: User = Depends(require_agency_group),
    use_case: GetAgencyPermissionsUseCase = Depends(get_get_agency_permissions_use_case),
):
    """Retorna la configuración de permisos de la agencia actual."""
    if not current_user.agency_id:
        from fastapi import HTTPException
        raise HTTPException(400, detail="El usuario no pertenece a una agencia")

    return await use_case.execute(str(current_user.agency_id))


@agencies_router.patch("/my/permissions")
async def update_my_permissions(
    permissions: dict,
    current_user: User = Depends(require_owner_or_admin),
    use_case: UpdateAgencyPermissionsUseCase = Depends(get_update_agency_permissions_use_case),
):
    """Actualiza la configuración de permisos de la agencia actual."""
    if not current_user.agency_id:
        from fastapi import HTTPException
        raise HTTPException(400, detail="El usuario no pertenece a una agencia")

    return await use_case.execute(str(current_user.agency_id), permissions)
