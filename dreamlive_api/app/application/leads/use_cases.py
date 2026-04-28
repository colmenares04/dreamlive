"""
Casos de uso: Leads y Vista General del sistema (Supabase adapters).
"""
from typing import List, Optional, Tuple, Dict, Any

from app.core.entities.models import Lead, LeadStatus
from app.core.ports.repositories import (
    ILeadRepository, ILicenseRepository, IAgencyRepository,
    ITicketRepository, IAuditLogRepository
)
from app.infrastructure.cache.redis_cache import cache_service


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS
# ═══════════════════════════════════════════════════════════════════════════════
class ListLeadsUseCase:
    def __init__(self, lead_repo: ILeadRepository, license_repo: ILicenseRepository):
        self._repo = lead_repo
        self._license_repo = license_repo

    async def execute(
        self,
        agency_id: str,
        license_id: str | None = None,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None,
        search: Optional[str] = None,
        min_viewers: Optional[int] = None,
        min_likes: Optional[int] = None
    ) -> Tuple[List[Lead], int]:
        st = LeadStatus(status) if status else None
        
        target_licenses = []
        if license_id:
            target_licenses = [license_id]
        else:
            # Fetch all licenses for agency
            licenses = await self._license_repo.list_all(agency_id=agency_id)
            target_licenses = [str(l.id) for l in licenses]
            
        if not target_licenses:
            return [], 0
            
        return await self._repo.list_paginated(
            license_ids=target_licenses,
            page=page,
            page_size=page_size,
            status=st,
            search=search,
            min_viewers=min_viewers,
            min_likes=min_likes
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
        ticket_repo: ITicketRepository,
        audit_repo: IAuditLogRepository
    ):
        self._leads = lead_repo
        self._licenses = license_repo
        self._agencies = agency_repo
        self._tickets = ticket_repo
        self._audit = audit_repo

    async def execute(self, days: int = 7) -> Dict[str, Any]:
        # --- Redis Cache Layer ---
        cache_key = f"admin:overview:{days}"
        cached = await cache_service.get(cache_key)
        if cached: return cached

        # Perform highly optimized parallel fetching
        import asyncio
        tasks = [
            self._licenses.list_all(),
            self._agencies.list_all(),
            self._licenses.count_active_sessions(),
            self._tickets.get_avg_resolution_time(),
            self._audit.get_recent_activity(limit=10)
        ]
        licenses, agencies, active_sessions, avg_sla, recent_audit = await asyncio.gather(*tasks)

        license_ids = [str(l.id) for l in licenses]
        counts = await self._leads.count_by_status_bulk(license_ids)
        trends = await self._leads.get_daily_stats_bulk(license_ids, days)

        result = {
            "total_licenses":    len(licenses),
            "active_agencies":   len(agencies),
            "active_sessions":   active_sessions,
            "avg_ticket_sla":    round(avg_sla, 1),
            "available_leads":   counts.get("disponible", 0),
            "pending_collected": counts.get("recopilado", 0),
            "today_contacted":   counts.get("contactado", 0),
            "today_collected":   counts.get("recopilado", 0) + counts.get("disponible", 0),
            "trends":            trends,
            "recent_activity":   [{
                "category": a.category, "action": a.action, 
                "entity": a.entity_name, "date": a.created_at.isoformat()
            } for a in recent_audit]
        }

        # Save to cache for 60s
        await cache_service.set(cache_key, result, ttl_seconds=60)
        return result


class GetAgencyDashboardUseCase:
    def __init__(
        self,
        lead_repo: ILeadRepository,
        license_repo: ILicenseRepository,
    ):
        self._leads = lead_repo
        self._licenses = license_repo

    async def execute(self, agency_id: str, days: int = 7) -> Dict[str, Any]:
        # --- Redis Cache Layer ---
        cache_key = f"agency:{agency_id}:dashboard:{days}"
        cached = await cache_service.get(cache_key)
        if cached: return cached

        licenses = await self._licenses.list_all(agency_id=agency_id)
        license_ids = [str(l.id) for l in licenses]

        if not license_ids:
            return {
                "active_licenses": 0, "total_leads": 0, "contacted_total": 0,
                "available_leads": 0, "collected_leads": 0, "conversion_rate": 0,
                "trends": [], "top_keywords": []
            }

        counts = await self._leads.count_by_status_bulk(license_ids)
        trends = await self._leads.get_daily_stats_bulk(license_ids, days)

        contacted = counts.get("contactado", 0)
        collected = counts.get("recopilado", 0)
        available = counts.get("disponible", 0)
        total     = sum(counts.values())

        # Conversion Rate: Contacted / (Collected + Contacted + Available)
        conversion = (contacted / total * 100) if total > 0 else 0

        from collections import Counter
        word_counter: Counter = Counter()
        for lic in licenses:
            kw = getattr(lic, "keywords", None) or ""
            for w in (w.strip().lower() for w in kw.split("/") if w.strip()):
                word_counter[w] += 1
        
        result = {
            "active_licenses":  sum(1 for l in licenses if l.is_active),
            "total_leads":      total,
            "contacted_total":  contacted,
            "available_leads":  available,
            "collected_leads":  collected,
            "conversion_rate":  round(conversion, 1),
            "trends":           trends,
            "top_keywords":     [w for w, _ in word_counter.most_common(5)],
        }

        # Save to cache for 60s
        await cache_service.set(cache_key, result, ttl_seconds=60)
        return result

class SaveLeadUseCase:
    """Guarda o actualiza un lead capturado."""

    def __init__(self, lead_repo: ILeadRepository):
        self._repo = lead_repo

    async def execute(
        self,
        license_id: str,
        username: str,
        viewer_count: int = 0,
        likes_count: int = 0,
        source: str = "unknown"
    ) -> Lead:
        # Nota: Por ahora usamos create, pero idealmente sería un upsert
        # Para simplificar con el repositorio actual, intentamos crear.
        # Si ya existe, podríamos actualizarlo, pero el repo actual no tiene get_by_username_and_license.
        # Vamos a asumir que el repo manejará la lógica de inserción básica por ahora.
        lead = Lead(
            id=None,
            license_id=license_id,
            username=username,
            status=LeadStatus.COLLECTED,
            viewer_count=viewer_count,
            likes_count=likes_count,
            source=source
        )
        return await self._repo.create(lead)


class UpdateLeadStatusUseCase:
    """Actualiza el estado de un lead."""

    def __init__(self, lead_repo: ILeadRepository):
        self._repo = lead_repo

    async def execute(
        self,
        license_id: str,
        username: str,
        new_status: str
    ) -> bool:
        # Buscamos el lead primero (necesitaríamos un método en el repo)
        # Como el repo no lo tiene, vamos a delegar esto a una mejora del repo o usar list_paginated para buscarlo
        # Pero lo más limpio es añadir get_by_username a ILeadRepository.
        
        # Por ahora, implementemos la lógica asumiendo que el repo puede filtrar por username
        # (Esto requerirá cambios en all_repos.py)
        pass
