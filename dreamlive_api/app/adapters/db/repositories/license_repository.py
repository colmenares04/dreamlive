"""
Repositorio concreto de Licencias (Supabase).

Adaptador en la capa de Adapters. Implementa ILicenseRepository
usando el cliente sincrónico de supabase-py ejecutado en thread pool.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from supabase import Client

from app.core.entities.license import License
from app.core.ports.license_repository import ILicenseRepository


class LicenseRepository(ILicenseRepository):
    """Implementación Supabase del repositorio de licencias."""

    def __init__(self, db: Client) -> None:
        self._db = db

    def _to_domain(self, row: dict) -> License:
        expires_str = row.get("expiration_date")
        try:
            expires_at = (
                datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
                if expires_str
                else None
            )
        except (ValueError, TypeError):
            expires_at = None
        return License(
            id=row.get("id"),
            agency_id=row.get("agency_id", ""),
            license_key=row.get("license_key", ""),
            email=row.get("email"),
            is_active=row.get("is_active", True),
            max_devices=row.get("max_devices", 1),
            expiration_date=expires_at,
            keywords=row.get("keywords", ""),
            message_templates=row.get("message_templates") or [],
            recruiter_name=row.get("recruiter_name", ""),
            limit_requests=row.get("limit_requests", 60),
            refresh_minutes=row.get("refresh_minutes", 720),
            admin_password=row.get("admin_password", "admin123"),
            invitation_types=row.get("invitation_types") or [],
            theme=row.get("theme", "dark"),
        )

    async def get_by_id(self, license_id: str) -> Optional[License]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").select("*").eq("id", license_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_by_key(self, key: str) -> Optional[License]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").select("*").eq("license_key", key).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, license_: License) -> License:
        data = {
            "agency_id": license_.agency_id,
            "license_key": license_.license_key,
            "email": license_.email,
            "is_active": license_.is_active,
            "max_devices": license_.max_devices,
            "expiration_date": license_.expiration_date.isoformat() if license_.expiration_date else None,
            "keywords": license_.keywords,
            "message_templates": license_.message_templates,
            "recruiter_name": license_.recruiter_name,
            "limit_requests": license_.limit_requests,
            "refresh_minutes": license_.refresh_minutes,
            "admin_password": license_.admin_password,
            "invitation_types": license_.invitation_types,
            "theme": license_.theme,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, license_: License) -> License:
        data = {
            "email": license_.email,
            "is_active": license_.is_active,
            "max_devices": license_.max_devices,
            "expiration_date": license_.expiration_date.isoformat() if license_.expiration_date else None,
            "keywords": license_.keywords,
            "message_templates": license_.message_templates,
            "recruiter_name": license_.recruiter_name,
            "limit_requests": license_.limit_requests,
            "refresh_minutes": license_.refresh_minutes,
            "admin_password": license_.admin_password,
            "invitation_types": license_.invitation_types,
            "theme": license_.theme,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").update(data).eq("id", license_.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def delete(self, license_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("licenses").delete().eq("id", license_id).execute()
        )

    async def update_date(self, license_id: str, new_date: datetime) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("licenses")
            .update({"expiration_date": new_date.isoformat()})
            .eq("id", license_id)
            .execute()
        )

    async def list_all(
        self,
        is_active: Optional[bool] = None,
        agency_id: Optional[str] = None,
    ) -> List[License]:
        def _query():
            q = self._db.table("licenses").select("*")
            if is_active is not None:
                q = q.eq("is_active", is_active)
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.execute()

        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]

    async def bulk_update_password(self, agency_id: str, new_password: str) -> int:
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses")
            .update({"admin_password": new_password})
            .eq("agency_id", agency_id)
            .execute()
        )
        return len(resp.data) if resp.data else 0

    async def count_active_sessions(self, agency_id: Optional[str] = None) -> int:
        two_mins_ago = (datetime.utcnow() - timedelta(minutes=2)).isoformat()

        def _query():
            q = self._db.table("license_sessions").select("id", count="exact")
            q = q.gt("last_ping", two_mins_ago)
            return q.execute()

        resp = await asyncio.to_thread(_query)
        return resp.count or 0

    async def get_last_pings(self, license_ids: List[str]) -> Dict[str, str]:
        if not license_ids:
            return {}

        resp = await asyncio.to_thread(
            lambda: self._db.table("license_sessions")
            .select("license_id, last_ping")
            .in_("license_id", license_ids)
            .execute()
        )
        return {r["license_id"]: r["last_ping"] for r in resp.data}
