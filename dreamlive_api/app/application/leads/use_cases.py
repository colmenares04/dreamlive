"""
Casos de uso: Leads y Vista General del sistema (Unit of Work).
"""
from typing import List, Optional, Tuple, Dict, Any
import asyncio

from app.core.entities.lead import Lead, LeadStatus
from app.core.ports.unit_of_work import IUnitOfWork
from app.core.ports.cache import ICacheService


# ═══════════════════════════════════════════════════════════════════════════════
# LEADS
# ═══════════════════════════════════════════════════════════════════════════════
class ListLeadsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        agency_id: Optional[str] = None,
        license_id: str | None = None,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        min_viewers: Optional[int] = None,
        min_likes: Optional[int] = None
    ) -> Tuple[List[Lead], int]:
        st = LeadStatus(status) if status else None
        
        target_licenses = []
        if license_id:
            target_licenses = [license_id]
        else:
            # Fetch licenses for agency or all if agency_id is None
            licenses = await self._uow.licenses.list_all(agency_id=agency_id)
            target_licenses = [str(l.id) for l in licenses]
            
        if not target_licenses:
            return [], 0
            
        return await self._uow.leads.list_paginated(
            license_ids=target_licenses,
            page=page,
            page_size=page_size,
            status=st,
            source=source,
            search=search,
            min_viewers=min_viewers,
            min_likes=min_likes
        )


class PurgeLeadsUseCase:
    """Elimina leads en estado 'recopilado' sin procesar."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: Optional[str] = None) -> Dict[str, int]:
        return {"deleted": 0}

class PurgeLeadsByStatusUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: str, status: str, license_id: Optional[str] = None) -> int:
        st = LeadStatus(status)
        async with self._uow:
            target_licenses = []
            if license_id:
                target_licenses = [license_id]
            else:
                licenses = await self._uow.licenses.list_all(agency_id=agency_id)
                target_licenses = [str(l.id) for l in licenses]
            
            if not target_licenses:
                return 0
                
            deleted = await self._uow.leads.delete_by_status(target_licenses, st)
            await self._uow.commit()
            return deleted

class DeleteLeadUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: str, lead_id: str) -> bool:
        async with self._uow:
            import uuid
            lead = None
            try:
                uuid.UUID(lead_id)
                lead = await self._uow.leads.get_by_id(lead_id)
            except ValueError:
                licenses = await self._uow.licenses.list_all(agency_id=agency_id)
                license_ids = [str(l.id) for l in licenses]
                for lid in license_ids:
                    lead = await self._uow.leads.get_by_username(lid, lead_id)
                    if lead:
                        break

            if not lead:
                return False
                
            licenses = await self._uow.licenses.list_all(agency_id=agency_id)
            license_ids = [str(l.id) for l in licenses]
            if lead.license_id not in license_ids:
                return False
                
            success = await self._uow.leads.delete(str(lead.id))
            await self._uow.commit()
            return success


# ═══════════════════════════════════════════════════════════════════════════════
# OVERVIEW / DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
class GetAdminOverviewUseCase:
    def __init__(self, uow: IUnitOfWork, cache_service: ICacheService):
        self._uow = uow
        self._cache = cache_service

    async def execute(self, days: int = 7) -> Dict[str, Any]:
        cache_key = f"admin:overview:{days}"
        cached = await self._cache.get(cache_key)
        if cached: return cached

        tasks = [
            self._uow.licenses.list_all(),
            self._uow.agencies.list_all(),
            self._uow.licenses.count_active_sessions(),
            self._uow.tickets.get_avg_resolution_time(),
            self._uow.audit_logs.get_recent_activity(limit=10)
        ]
        licenses, agencies, active_sessions, avg_sla, recent_audit = await asyncio.gather(*tasks)

        license_ids = [str(l.id) for l in licenses]
        counts = await self._uow.leads.count_by_status_bulk(license_ids)
        trends = await self._uow.leads.get_daily_stats_bulk(license_ids, days)

        result = {
            "total_licenses":    len(licenses),
            "active_agencies":   len(agencies),
            "active_sessions":   active_sessions,
            "avg_ticket_sla":    round(avg_sla, 1),
            "available_leads":   counts.get(LeadStatus.AVAILABLE, 0),
            "pending_collected": counts.get(LeadStatus.COLLECTED, 0),
            "today_contacted":   counts.get(LeadStatus.CONTACTED, 0),
            "today_collected":   counts.get(LeadStatus.COLLECTED, 0) + counts.get(LeadStatus.AVAILABLE, 0),
            "trends":            trends,
            "recent_activity":   [{
                "category": a.category, "action": a.action, 
                "entity": a.entity_name, "date": a.created_at.isoformat()
            } for a in recent_audit]
        }

        await self._cache.set(cache_key, result, ttl_seconds=60)
        return result


class GetAgencyDashboardUseCase:
    def __init__(self, uow: IUnitOfWork, cache_service: ICacheService):
        self._uow = uow
        self._cache = cache_service

    async def execute(self, agency_id: str, days: int = 7) -> Dict[str, Any]:
        cache_key = f"agency:{agency_id}:dashboard:{days}"
        cached = await self._cache.get(cache_key)
        if cached: return cached

        licenses = await self._uow.licenses.list_all(agency_id=agency_id)
        license_ids = [str(l.id) for l in licenses]

        if not license_ids:
            return {
                "active_licenses": 0, "total_leads": 0, "contacted_total": 0,
                "available_leads": 0, "collected_leads": 0, "conversion_rate": 0,
                "trends": [], "top_keywords": []
            }

        counts = await self._uow.leads.count_by_status_bulk(license_ids)
        trends = await self._uow.leads.get_daily_stats_bulk(license_ids, days)

        contacted = counts.get(LeadStatus.CONTACTED, 0)
        total     = sum(counts.values())
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
            "available_leads":  counts.get(LeadStatus.AVAILABLE, 0),
            "collected_leads":  counts.get(LeadStatus.COLLECTED, 0),
            "conversion_rate":  round(conversion, 1),
            "trends":           trends,
            "top_keywords":     [w for w, _ in word_counter.most_common(5)],
        }

        await self._cache.set(cache_key, result, ttl_seconds=60)
        return result


class SaveLeadUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        license_id: str,
        username: str,
        viewer_count: int = 0,
        likes_count: int = 0,
        source: str = "unknown"
    ) -> Lead:
        lead = Lead(
            id=None,
            license_id=license_id,
            username=username,
            status=LeadStatus.COLLECTED,
            viewer_count=viewer_count,
            likes_count=likes_count,
            source=source
        )
        async with self._uow:
            created = await self._uow.leads.create(lead)
            await self._uow.commit()
            return created


class UpdateLeadStatusUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        license_id: str,
        username: str,
        new_status: str
    ) -> bool:
        from app.core.domain.exceptions import RateLimitExceeded
        from datetime import datetime, date

        async with self._uow:
            lead = await self._uow.leads.get_by_username(license_id, username)
            if not lead:
                return False

            if new_status == LeadStatus.CONTACTED:
                # Validar la cuota diaria de la licencia
                lic = await self._uow.licenses.get_by_id(license_id)
                if lic:
                    now_dt = datetime.utcnow()
                    today_date = now_dt.date()

                    last_dt = getattr(lic, "last_contact_date", None)
                    if last_dt and last_dt.tzinfo is not None:
                        last_dt = last_dt.replace(tzinfo=None)

                    refresh_seconds = (getattr(lic, "refresh_minutes", 1440) or 1440) * 60
                    if last_dt:
                        elapsed = (now_dt - last_dt).total_seconds()
                        if elapsed >= refresh_seconds:
                            lic.daily_contact_count = 0

                    if lic.daily_contact_count >= getattr(lic, "limit_requests", 60):
                        raise RateLimitExceeded(
                            f"Se ha alcanzado el límite diario de la licencia ({getattr(lic, 'limit_requests', 60)} mensajes hoy)."
                        )

                    # Incrementar contador y guardar fecha de último contacto
                    lic.daily_contact_count += 1
                    lic.last_contact_date = now_dt
                    await self._uow.licenses.update(lic)

            lead.status = LeadStatus(new_status)
            await self._uow.leads.update(lead)
            await self._uow.commit()
            return True


class ProcessBatchLeadsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        license_id: str,
        availables: List[str],
        discarded: List[str]
    ) -> Dict[str, int]:
        async with self._uow:
            # 1. Update availables to AVAILABLE status
            updated = 0
            if availables:
                updated = await self._uow.leads.update_status_bulk(
                    license_id=license_id,
                    usernames=availables,
                    new_status=LeadStatus.AVAILABLE
                )
            
            # 2. Delete discarded
            deleted = 0
            if discarded:
                deleted = await self._uow.leads.delete_bulk_by_username(
                    license_id=license_id,
                    usernames=discarded
                )
            
            await self._uow.commit()
            return {"updated": updated, "deleted": deleted}


class GetLicensePerformanceUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: Optional[str] = None) -> dict:
        licenses = await self._uow.licenses.list_all(agency_id=agency_id) if agency_id else await self._uow.licenses.list_all()
        license_ids = [str(l.id) for l in licenses]
        if not license_ids: return {}

        stats, pings, grouped_counts = await asyncio.gather(
            self._uow.leads.get_license_performance_stats(license_ids),
            self._uow.licenses.get_last_pings(license_ids),
            self._uow.leads.count_by_status_grouped_by_license(license_ids)
        )

        return {
            lid: {
                "today": stats.get(lid, {}).get("today", 0),
                "total": stats.get(lid, {}).get("total", 0),
                "last_ping": pings.get(lid),
                "collected": grouped_counts.get(lid, {}).get(LeadStatus.COLLECTED, 0),
                "available": grouped_counts.get(lid, {}).get(LeadStatus.AVAILABLE, 0),
                "contacted": grouped_counts.get(lid, {}).get(LeadStatus.CONTACTED, 0),
            } for lid in license_ids
        }
