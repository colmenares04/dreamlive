"""
Repositorio concreto de AppVersion (Supabase).
"""
import asyncio
from datetime import datetime
from typing import List, Optional

from supabase import Client

from app.core.entities.app_version import AppVersion
from app.core.ports.app_version_repository import IAppVersionRepository


class AppVersionRepository(IAppVersionRepository):
    """Implementación Supabase del repositorio de versiones de la aplicación."""

    def __init__(self, db: Client) -> None:
        self._db = db

    def _to_domain(self, row: dict) -> AppVersion:
        rel_str = row.get("release_date")
        try:
            rel_date = datetime.fromisoformat(rel_str.replace("Z", "+00:00")) if rel_str else datetime.utcnow()
        except (ValueError, TypeError):
            rel_date = datetime.utcnow()
        return AppVersion(
            id=row.get("id"),
            version_number=row.get("version_number", ""),
            changelog=row.get("changelog", ""),
            is_active=row.get("is_active", True),
            file_url=row.get("file_url", ""),
            file_size_kb=row.get("file_size_kb", 0),
            tags=row.get("tags") or [],
            platform=row.get("platform", "windows"),
            release_date=rel_date,
        )

    async def get_by_id(self, version_id: str) -> Optional[AppVersion]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").select("*").eq("id", version_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_latest_active(self, platform: str) -> Optional[AppVersion]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions")
            .select("*")
            .eq("platform", platform)
            .eq("is_active", True)
            .order("release_date", desc=True)
            .limit(1)
            .execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, version: AppVersion) -> AppVersion:
        data = {
            "version_number": version.version_number,
            "changelog": version.changelog,
            "is_active": version.is_active,
            "file_url": version.file_url,
            "file_size_kb": version.file_size_kb,
            "tags": version.tags,
            "platform": version.platform,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def delete(self, version_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("app_versions").delete().eq("id", version_id).execute()
        )

    async def list_all(self) -> List[AppVersion]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").select("*").order("release_date", desc=True).execute()
        )
        return [self._to_domain(r) for r in resp.data]
