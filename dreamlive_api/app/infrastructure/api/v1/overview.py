"""
Overview & Dashboard endpoints — Controladores "tontos".
"""
from fastapi import APIRouter, Depends

from app.application.leads.use_cases import GetAdminOverviewUseCase, GetAgencyDashboardUseCase
from app.infrastructure.api.deps import require_admin, require_agency_group, get_current_user
from app.infrastructure.api.providers import (
    get_admin_overview_use_case,
    get_agency_dashboard_use_case,
)
from app.core.entities.user import User


overview_router = APIRouter(prefix="/overview", tags=["Overview"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@overview_router.get("/", dependencies=[Depends(require_admin)])
async def get_overview(
    days: int = 7,
    use_case: GetAdminOverviewUseCase = Depends(get_admin_overview_use_case),
):
    return await use_case.execute(days=days)


@dashboard_router.get("/")
async def get_dashboard(
    days: int = 7,
    current_user: User = Depends(require_agency_group),
    use_case: GetAgencyDashboardUseCase = Depends(get_agency_dashboard_use_case),
):
    return await use_case.execute(str(current_user.agency_id), days=days)
