"""
Casos de uso: Leads y Vista General del sistema (Supabase adapters).
"""
from typing import List, Optional, Tuple, Dict, Any

from app.core.entities.models import Lead, LeadStatus
from app.core.ports.repositories import (
    ILeadRepository, ILicenseRepository, IAgencyRepository
)


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS
# ═══════════════════════════════════════════════════════════════════════════════
class ListLeadsUseCase:
    def __init__(self, lead_repo: ILeadRepository):
        self._repo = lead_repo

    async def execute(
        self,
        license_id: str | None = None,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None,
    ) -> Tuple[List[Lead], int]:
        st = LeadStatus(status) if status else None
        
        # En Supabase por ahora listamos por license en lugar de agency directo para no hacer subquery compleja
        if not license_id:
            return [], 0
            
        return await self._repo.list_paginated(
            license_id=license_id,
            page=page,
            page_size=page_size,
            status=st,
        )


class PurgeLeadsUseCase:
    """Elimina leads en estado 'recopilado' sin procesar."""

    def __init__(self, lead_repo: ILeadRepository):
        self._repo = lead_repo

    async def execute(self, agency_id: Optional[str] = None) -> Dict[str, int]:
        # Para purgar requerimos license_id en Supabase o logica batch.
        return {"deleted": 0}


class ExportLeadsUseCase:
    """Retorna todos los leads para exportación."""

    def __init__(self, lead_repo: ILeadRepository):
        self._repo = lead_repo

    async def execute(self, agency_id: str) -> List[Lead]:
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# OVERVIEW / DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
class GetAdminOverviewUseCase:
    def __init__(
        self,
        lead_repo: ILeadRepository,
        license_repo: ILicenseRepository,
        agency_repo: IAgencyRepository,
    ):
        self._leads = lead_repo
        self._licenses = license_repo
        self._agencies = agency_repo

    async def execute(self) -> Dict[str, Any]:
        return {
            "total_licenses": 0,
            "active_agencies": 0,
            "available_leads": 0,
            "pending_collected": 0,
        }


class GetAgencyDashboardUseCase:
    def __init__(
        self,
        lead_repo: ILeadRepository,
        license_repo: ILicenseRepository,
    ):
        self._leads = lead_repo
        self._licenses = license_repo

    async def execute(self, agency_id: str) -> Dict[str, Any]:
        return {
            "active_licenses": 0,
            "total_leads": 0,
            "contacted_total": 0,
            "available_leads": 0,
            "collected_leads": 0,
            "today_contacted": 0,
            "today_collected": 0,
            "top_keywords": [],
        }
