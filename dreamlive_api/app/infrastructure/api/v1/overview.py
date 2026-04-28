"""
Overview & Dashboard endpoints (extraídos de routes.py).
"""
from fastapi import APIRouter, Depends
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import (
    LeadRepository, LicenseRepository, AgencyRepository, 
    TicketRepository, AuditLogRepository
)
from app.application.leads.use_cases import GetAdminOverviewUseCase, GetAgencyDashboardUseCase
from app.infrastructure.api.deps import require_admin, require_agency_group, get_current_user
from app.core.entities.user import User


overview_router = APIRouter(prefix="/overview", tags=["Overview"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@overview_router.get("/", dependencies=[Depends(require_admin)])
async def get_overview(days: int = 7, db: Client = Depends(get_db)):
    use_case = GetAdminOverviewUseCase(
        LeadRepository(db), 
        LicenseRepository(db), 
        AgencyRepository(db),
        TicketRepository(db),
        AuditLogRepository(db)
    )
    return await use_case.execute(days=days)


@dashboard_router.get("/")
async def get_dashboard(
    days: int = 7, 
    current_user: User = Depends(require_agency_group), 
    db: Client = Depends(get_db)
):
    use_case = GetAgencyDashboardUseCase(
        LeadRepository(db), 
        LicenseRepository(db)
    )
    return await use_case.execute(str(current_user.agency_id), days=days)
