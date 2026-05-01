from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.app_version import AppVersion
from app.core.ports.app_version_repository import IAppVersionRepository
from app.adapters.db.models import AppVersionORM


class AppVersionRepository(IAppVersionRepository):
    """Implementación SQLAlchemy del repositorio de versiones de la aplicación."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: AppVersionORM) -> AppVersion:
        return AppVersion(
            id=str(orm.id),
            version_number=orm.version_number,
            changelog=orm.changelog,
            is_active=orm.is_active,
            file_url=orm.file_url,
            file_size_kb=orm.file_size_kb,
            tags=orm.tags or [],
            platform=orm.platform.value if hasattr(orm.platform, "value") else str(orm.platform),
            release_date=orm.release_date,
        )

    async def get_by_id(self, version_id: str) -> Optional[AppVersion]:
        if not version_id:
            return None
        result = await self._session.execute(select(AppVersionORM).where(AppVersionORM.id == version_id))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_latest_active(self, platform: str) -> Optional[AppVersion]:
        stmt = select(AppVersionORM).where(
            AppVersionORM.is_active == True
        ).order_by(AppVersionORM.release_date.desc()).limit(1)
        result = await self._session.execute(stmt)
        orms = result.scalars().all()
        for orm in orms:
            p_val = orm.platform.value if hasattr(orm.platform, "value") else str(orm.platform)
            if p_val.lower() == platform.lower():
                return self._to_domain(orm)
        return self._to_domain(orms[0]) if orms else None

    async def create(self, version: AppVersion) -> AppVersion:
        orm = AppVersionORM(
            version_number=version.version_number,
            changelog=version.changelog,
            is_active=version.is_active,
            file_url=version.file_url,
            file_size_kb=version.file_size_kb,
            tags=version.tags or [],
            platform=version.platform.lower() if version.platform else "windows",
            release_date=version.release_date or datetime.utcnow(),
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def delete(self, version_id: str) -> None:
        if not version_id:
            return
        result = await self._session.execute(select(AppVersionORM).where(AppVersionORM.id == version_id))
        orm = result.scalar_one_or_none()
        if orm:
            await self._session.delete(orm)
            await self._session.flush()

    async def list_all(self) -> List[AppVersion]:
        result = await self._session.execute(select(AppVersionORM).order_by(AppVersionORM.release_date.desc()))
        return [self._to_domain(orm) for orm in result.scalars().all()]
