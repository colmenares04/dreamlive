"""
Repositorio concreto de Leads (Supabase).
"""
import asyncio
from datetime import datetime, timedelta, time, date
from typing import Dict, List, Optional, Tuple

from supabase import Client

from app.core.entities.lead import Lead, LeadStatus
from app.core.ports.lead_repository import ILeadRepository


class LeadRepository(ILeadRepository):
    """Implementación Supabase del repositorio de leads (prospectos TikTok)."""

    _TABLE = "tiktok_leads"

    def __init__(self, db: Client) -> None:
        self._db = db

    def _to_domain(self, row: dict) -> Lead:
        cap_str = row.get("created_at") or row.get("captured_at")
        try:
            cap_at = datetime.fromisoformat(cap_str.replace("Z", "+00:00")) if cap_str else datetime.utcnow()
        except (ValueError, TypeError):
            cap_at = datetime.utcnow()
        return Lead(
            id=row.get("id"),
            license_id=row.get("license_id", ""),
            username=row.get("username", ""),
            status=LeadStatus(row.get("status", "recopilado")),
            viewer_count=row.get("viewer_count", 0),
            source=row.get("source", "unknown"),
            likes_count=row.get("likes_count", 0),
            captured_at=cap_at,
        )

    async def get_by_id(self, lead_id: str) -> Optional[Lead]:
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).select("*").eq("id", lead_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, lead: Lead) -> Lead:
        data = {
            "license_id": lead.license_id,
            "username": lead.username,
            "status": lead.status.value,
            "viewer_count": lead.viewer_count,
            "source": lead.source,
            "likes_count": lead.likes_count,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, lead: Lead) -> Lead:
        data = {
            "status": lead.status.value,
            "viewer_count": lead.viewer_count,
            "likes_count": lead.likes_count,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).update(data).eq("id", lead.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def delete(self, lead_id: str) -> bool:
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).delete().eq("id", lead_id).execute()
        )
        return len(resp.data) > 0

    async def delete_by_status(self, license_ids: List[str], status: LeadStatus) -> int:
        if not license_ids:
            return 0
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).delete().in_("license_id", license_ids).eq("status", status.value).execute()
        )
        return len(resp.data)

    async def list_paginated(
        self,
        license_ids: List[str],
        page: int = 1,
        page_size: int = 50,
        status: Optional[LeadStatus] = None,
        search: Optional[str] = None,
        min_viewers: Optional[int] = None,
        min_likes: Optional[int] = None,
    ) -> Tuple[List[Lead], int]:
        def _query():
            q = self._db.table(self._TABLE).select("*", count="exact").in_("license_id", license_ids)
            if status:
                q = q.eq("status", status.value)
            if search:
                q = q.ilike("username", f"%{search}%")
            if min_viewers is not None:
                q = q.gte("viewer_count", min_viewers)
            if min_likes is not None:
                q = q.gte("likes_count", min_likes)
            start = (page - 1) * page_size
            return q.order("captured_at", desc=True).range(start, start + page_size - 1).execute()

        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data], resp.count or 0

    async def count_by_status(self, license_id: str) -> Dict[str, int]:
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).select("status").eq("license_id", license_id).execute()
        )
        counts: Dict[str, int] = {}
        for row in resp.data:
            s = row.get("status")
            counts[s] = counts.get(s, 0) + 1
        return counts

    async def count_by_status_bulk(self, license_ids: List[str]) -> Dict[str, int]:
        if not license_ids:
            return {}
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE).select("status").in_("license_id", license_ids).execute()
        )
        counts: Dict[str, int] = {}
        for row in resp.data:
            s = row.get("status")
            counts[s] = counts.get(s, 0) + 1
        return counts

    async def get_daily_stats_bulk(self, license_ids: List[str], days: int) -> List[Dict]:
        stats = []
        for i in range(days):
            d: date = (datetime.utcnow() - timedelta(days=i)).date()
            start = datetime.combine(d, time.min).isoformat()
            end = datetime.combine(d, time.max).isoformat()

            resp = await asyncio.to_thread(
                lambda s=start, e=end: self._db.table(self._TABLE)
                .select("id", count="exact")
                .in_("license_id", license_ids)
                .gte("captured_at", s)
                .lte("captured_at", e)
                .execute()
            )
            stats.append({"date": d.isoformat(), "count": resp.count or 0})
        return stats[::-1]

    async def count_by_status_grouped_by_license(
        self, license_ids: List[str]
    ) -> Dict[str, Dict[str, int]]:
        if not license_ids:
            return {}
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE)
            .select("license_id, status")
            .in_("license_id", license_ids)
            .execute()
        )
        counts: Dict[str, Dict[str, int]] = {}
        for row in resp.data:
            lid = row.get("license_id")
            s = row.get("status")
            if lid not in counts:
                counts[lid] = {}
            counts[lid][s] = counts[lid].get(s, 0) + 1
        return counts

    async def count_under_date(
        self, license_ids: List[str], start_date: datetime
    ) -> Dict[str, int]:
        if not license_ids:
            return {}
        resp = await asyncio.to_thread(
            lambda: self._db.table(self._TABLE)
            .select("status")
            .in_("license_id", license_ids)
            .gte("captured_at", start_date.isoformat())
            .execute()
        )
        counts: Dict[str, int] = {}
        for row in resp.data:
            s = row.get("status")
            counts[s] = counts.get(s, 0) + 1
        return counts

    async def get_license_performance_stats(
        self, license_ids: List[str]
    ) -> Dict[str, Dict[str, int]]:
        if not license_ids:
            return {}
        today_start = datetime.combine(datetime.utcnow().date(), time.min).isoformat()

        total_resp, today_resp = await asyncio.gather(
            asyncio.to_thread(
                lambda: self._db.table(self._TABLE).select("license_id").in_("license_id", license_ids).execute()
            ),
            asyncio.to_thread(
                lambda: self._db.table(self._TABLE)
                .select("license_id")
                .in_("license_id", license_ids)
                .gte("captured_at", today_start)
                .execute()
            ),
        )

        stats: Dict[str, Dict[str, int]] = {lid: {"today": 0, "total": 0} for lid in license_ids}
        for r in total_resp.data:
            lid = r["license_id"]
            if lid in stats:
                stats[lid]["total"] += 1
        for r in today_resp.data:
            lid = r["license_id"]
            if lid in stats:
                stats[lid]["today"] += 1
        return stats
