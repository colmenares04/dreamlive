from fastapi import APIRouter, Depends
from typing import Any

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency

overview_router = APIRouter(prefix="/overview", tags=["Overview V2"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard V2"])


@overview_router.get("/")
async def get_overview(
    days: int = 7,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    from app.adapters.db.models import LeadORM, LicenseORM
    
    res_leads = await uow.session.execute(select(func.count()).select_from(LeadORM).where(LeadORM.agency_id == str(agency.id)))
    total_leads = res_leads.scalar() or 0
    
    res_licenses = await uow.session.execute(select(func.count()).select_from(LicenseORM).where(LicenseORM.agency_id == str(agency.id)))
    total_licenses = res_licenses.scalar() or 0
    
    return {
        "total_licenses": total_licenses,
        "active_agencies": 1, # Own agency
        "active_sessions": 0,
        "avg_ticket_sla": 0.0,
        "available_leads": total_leads,
        "pending_collected": 0,
        "today_contacted": 0,
        "today_collected": total_leads,
        "trends": [],
        "recent_activity": []
    }


@dashboard_router.get("/")
async def get_dashboard(
    days: int = 7,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    from app.adapters.db.models import LeadORM, LicenseORM
    
    res_leads = await uow.session.execute(select(func.count()).select_from(LeadORM).where(LeadORM.agency_id == str(agency.id)))
    total_leads = res_leads.scalar() or 0
    
    res_licenses = await uow.session.execute(select(func.count()).select_from(LicenseORM).where(LicenseORM.agency_id == str(agency.id)))
    total_licenses = res_licenses.scalar() or 0
    
    return {
        "active_licenses": total_licenses,
        "total_leads": total_leads,
        "contacted_total": 0,
        "available_leads": total_leads,
        "collected_leads": 0,
        "conversion_rate": 0.0,
        "trends": [],
        "top_keywords": []
    }
