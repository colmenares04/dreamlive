"""
Repositorio concreto de AuditLog (Supabase).
"""
import asyncio
from datetime import datetime
from typing import List, Optional

from supabase import Client

from app.core.entities.audit_log import AuditLog
from app.core.ports.audit_log_repository import IAuditLogRepository


class AuditLogRepository(IAuditLogRepository):
    """Implementación Supabase del repositorio de logs de auditoría."""

    def __init__(self, db: Client) -> None:
        self._db = db

    def _to_domain(self, row: dict) -> AuditLog:
        created_str = row.get("created_at")
        return AuditLog(
            id=row.get("id"),
            user_id=row.get("user_id"),
            agency_id=row.get("agency_id"),
            category=row.get("category", ""),
            action=row.get("action", ""),
            entity_name=row.get("entity_name"),
            entity_id=row.get("entity_id"),
            old_data=row.get("old_data"),
            new_data=row.get("new_data"),
            ip_address=row.get("ip_address"),
            created_at=(
                datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                if created_str
                else datetime.utcnow()
            ),
        )

    async def list_all(self, agency_id: Optional[str] = None) -> List[AuditLog]:
        def _query():
            q = self._db.table("audit_logs").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.order("created_at", desc=True).execute()

        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]

    async def create(self, log: AuditLog) -> AuditLog:
        data = {
            "user_id": log.user_id,
            "agency_id": log.agency_id,
            "category": log.category,
            "action": log.action,
            "entity_name": log.entity_name,
            "entity_id": log.entity_id,
            "old_data": log.old_data,
            "new_data": log.new_data,
            "ip_address": log.ip_address,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("audit_logs").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def get_recent_activity(
        self, limit: int = 10, agency_id: Optional[str] = None
    ) -> List[AuditLog]:
        def _query():
            q = self._db.table("audit_logs").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.order("created_at", desc=True).limit(limit).execute()

        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]
