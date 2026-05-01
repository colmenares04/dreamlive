from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.license import License, LicenseStatus
from app.core.ports.license_repository import ILicenseRepository
from app.adapters.db.models import LicenseORM, LicenseSessionORM


class LicenseRepository(ILicenseRepository):
    """Implementación SQLAlchemy del repositorio de licencias."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: LicenseORM) -> License:
        return License(
            id=str(orm.id),
            agency_id=str(orm.agency_id),
            license_key=orm.key,
            email=orm.email,
            is_active=orm.is_active,
            max_devices=orm.max_devices,
            expiration_date=orm.expires_at,
            full_name=orm.full_name,
            keywords=orm.keywords or "batallas/versus/duelo/pk",
            message_templates=orm.message_templates or [],
            recruiter_name=orm.recruiter_name,
            limit_requests=orm.request_limit,
            refresh_minutes=orm.refresh_minutes,
            admin_password=orm.admin_password or "admin123",
            invitation_types=orm.invitation_types or [],
            theme=orm.theme or "dark",
        )

    async def get_by_id(self, license_id: str) -> Optional[License]:
        if not license_id:
            return None
        result = await self._session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_by_key(self, key: str) -> Optional[License]:
        if not key:
            return None
        result = await self._session.execute(select(LicenseORM).where(LicenseORM.key == key))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_by_email(self, email: str) -> Optional[License]:
        if not email:
            return None
        result = await self._session.execute(select(LicenseORM).where(LicenseORM.email == email))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def create(self, license_: License) -> License:
        orm = LicenseORM(
            key=license_.license_key,
            agency_id=license_.agency_id,
            email=license_.email,
            is_active=license_.is_active,
            max_devices=license_.max_devices,
            expires_at=license_.expiration_date,
            full_name=license_.full_name,
            keywords=license_.keywords or "batallas/versus/duelo/pk",
            message_templates=license_.message_templates or [],
            recruiter_name=license_.recruiter_name,
            request_limit=license_.limit_requests,
            refresh_minutes=license_.refresh_minutes,
            admin_password=license_.admin_password or "admin123",
            invitation_types=license_.invitation_types or [],
            theme=license_.theme or "dark",
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def update(self, license_: License) -> License:
        if not license_.id:
            raise ValueError("License ID required to update.")
        result = await self._session.execute(select(LicenseORM).where(LicenseORM.id == license_.id))
        orm = result.scalar_one_or_none()
        if not orm:
            raise ValueError(f"License with ID {license_.id} not found.")

        orm.key = license_.license_key
        orm.email = license_.email
        orm.is_active = license_.is_active
        orm.max_devices = license_.max_devices
        orm.expires_at = license_.expiration_date
        orm.full_name = license_.full_name
        orm.keywords = license_.keywords
        orm.message_templates = license_.message_templates
        orm.recruiter_name = license_.recruiter_name
        orm.request_limit = license_.limit_requests
        orm.refresh_minutes = license_.refresh_minutes
        orm.admin_password = license_.admin_password
        orm.invitation_types = license_.invitation_types
        orm.theme = license_.theme

        await self._session.flush()
        return self._to_domain(orm)

    async def delete(self, license_id: str) -> None:
        if not license_id:
            return
        result = await self._session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
        orm = result.scalar_one_or_none()
        if orm:
            await self._session.delete(orm)
            await self._session.flush()

    async def list_all(
        self,
        is_active: Optional[bool] = None,
        agency_id: Optional[str] = None,
    ) -> List[License]:
        stmt = select(LicenseORM)
        filters = []
        if is_active is not None:
            filters.append(LicenseORM.is_active == is_active)
        if agency_id:
            filters.append(LicenseORM.agency_id == agency_id)

        if filters:
            stmt = stmt.where(and_(*filters))
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def bulk_update_password(self, agency_id: str, password: str) -> int:
        if not agency_id:
            return 0
        stmt = select(LicenseORM).where(LicenseORM.agency_id == agency_id)
        result = await self._session.execute(stmt)
        orms = result.scalars().all()
        for orm in orms:
            orm.admin_password = password
        await self._session.flush()
        return len(orms)

    async def update_date(self, license_id: str, new_date: datetime) -> None:
        if not license_id:
            return
        result = await self._session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
        orm = result.scalar_one_or_none()
        if orm:
            orm.expires_at = new_date
            await self._session.flush()

    async def upsert_session(
        self,
        license_id: str,
        session_id: str,
        device_id: str,
        browser_name: Optional[str] = None,
        os_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        # Generic UUID session
        result = await self._session.execute(
            select(LicenseSessionORM).where(LicenseSessionORM.device_id == device_id)
        )
        orm = result.scalar_one_or_none()
        if not orm:
            orm = LicenseSessionORM(
                id=session_id,
                license_id=license_id,
                device_id=device_id,
                browser=browser_name,
                os=os_name,
                ip_address=ip_address,
            )
            self._session.add(orm)
        else:
            orm.id = session_id
            orm.license_id = license_id
            orm.browser = browser_name
            orm.os = os_name
            orm.ip_address = ip_address
        await self._session.flush()
