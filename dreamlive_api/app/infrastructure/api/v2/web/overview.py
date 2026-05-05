from fastapi import APIRouter, Depends
from typing import Any, List
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import LeadORM, LicenseORM
from app.core.entities.lead import LeadStatus

overview_router = APIRouter(prefix="/overview", tags=["Overview V2"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard V2"])


@overview_router.get("/")
async def get_overview(
    days: int = 7,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    # 1. Licencias totales
    res_licenses = await uow.session.execute(
        select(func.count()).select_from(LicenseORM).where(LicenseORM.agency_id == str(agency.id))
    )
    total_licenses = res_licenses.scalar() or 0
    
    # 2. Leads totales
    res_leads = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(LeadORM.agency_id == str(agency.id))
    )
    total_leads = res_leads.scalar() or 0
    
    # 3. Disponibles
    res_avail = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(
            and_(LeadORM.agency_id == str(agency.id), LeadORM.status == LeadStatus.AVAILABLE)
        )
    )
    available_leads = res_avail.scalar() or 0

    # 4. Hoy (Recopilados hoy)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    res_today = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(
            and_(LeadORM.agency_id == str(agency.id), LeadORM.created_at >= today_start)
        )
    )
    today_collected = res_today.scalar() or 0

    # 5. Contactados hoy
    res_today_cont = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(
            and_(
                LeadORM.agency_id == str(agency.id), 
                LeadORM.status == LeadStatus.CONTACTED,
                LeadORM.created_at >= today_start
            )
        )
    )
    today_contacted = res_today_cont.scalar() or 0
    
    return {
        "total_licenses": total_licenses,
        "active_agencies": 1, # Propia agencia
        "active_sessions": total_licenses, # Mock: asumiendo licencias activas
        "avg_ticket_sla": 0.0,
        "available_leads": available_leads,
        "pending_collected": total_leads - available_leads - today_contacted,
        "today_contacted": today_contacted,
        "today_collected": today_collected,
        "trends": [], # Dashboard tiene la lógica de trends
        "recent_activity": []
    }


@dashboard_router.get("/")
async def get_dashboard(
    days: int = 7,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    # 1. Stats básicas
    res_total = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(LeadORM.agency_id == str(agency.id))
    )
    total_leads = res_total.scalar() or 0

    res_cont = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(
            and_(LeadORM.agency_id == str(agency.id), LeadORM.status == LeadStatus.CONTACTED)
        )
    )
    contacted_total = res_cont.scalar() or 0

    res_avail = await uow.session.execute(
        select(func.count()).select_from(LeadORM).where(
            and_(LeadORM.agency_id == str(agency.id), LeadORM.status == LeadStatus.AVAILABLE)
        )
    )
    available_leads = res_avail.scalar() or 0

    res_lic = await uow.session.execute(
        select(func.count()).select_from(LicenseORM).where(
            and_(LicenseORM.agency_id == str(agency.id), LicenseORM.is_active == True)
        )
    )
    active_licenses = res_lic.scalar() or 0

    # 2. Trends (últimos X días)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt_trends = (
        select(
            func.date(LeadORM.created_at).label("date"),
            func.count().label("count")
        )
        .where(and_(LeadORM.agency_id == str(agency.id), LeadORM.created_at >= since))
        .group_by(func.date(LeadORM.created_at))
        .order_by(func.date(LeadORM.created_at))
    )
    res_trends = await uow.session.execute(stmt_trends)
    trends = [{"date": str(r.date), "leads": r.count} for r in res_trends.all()]

    # 3. Top Keywords (opcional, mock por ahora)
    top_keywords = ["batallas", "versus", "duelo", "pk"]

    return {
        "active_licenses": active_licenses,
        "total_leads": total_leads,
        "contacted_total": contacted_total,
        "available_leads": available_leads,
        "collected_leads": total_leads - available_leads - contacted_total,
        "conversion_rate": round((contacted_total / total_leads * 100), 2) if total_leads > 0 else 0,
        "trends": trends,
        "top_keywords": top_keywords
    }
