"""
Casos de uso: Licencias, Agencias, Versiones de App (Adaptados para Supabase).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.entities.models import (
    Agency, License, AppVersion
)
from app.core.ports.repositories import (
    ILicenseRepository, IAgencyRepository, IAppVersionRepository
)


# ═══════════════════════════════════════════════════════════════════════════════
# LICENCIAS
# ═══════════════════════════════════════════════════════════════════════════════
class CreateLicenseUseCase:
    def __init__(self, license_repo: ILicenseRepository):
        self._repo = license_repo

    async def execute(
        self,
        agency_id: str,
        recruiter_name: str,
        days: int,
        request_limit: int = 60,
        refresh_minutes: int = 1,
    ) -> License:
        expires_at = datetime.now(timezone.utc) + timedelta(days=days)
        new_license = License(
            id=None,
            license_key=str(uuid.uuid4()).upper(),
            agency_id=agency_id,
            recruiter_name=recruiter_name,
            is_active=True,
            limit_requests=request_limit,
            refresh_minutes=refresh_minutes,
            expiration_date=expires_at,
        )
        return await self._repo.create(new_license)


class ExtendLicenseUseCase:
    def __init__(self, license_repo: ILicenseRepository):
        self._repo = license_repo

    async def execute(self, license_id: str, days: int) -> License:
        license_ = await self._repo.get_by_id(license_id)
        if not license_:
            raise ValueError("Licencia no encontrada.")
        
        base = license_.expiration_date if license_.expiration_date else datetime.utcnow()
        license_.expiration_date = base + timedelta(days=days)
        license_.is_active = True
        return await self._repo.update(license_)


class ToggleLicenseUseCase:
    def __init__(self, license_repo: ILicenseRepository):
        self._repo = license_repo

    async def execute(self, license_id: str) -> License:
        license_ = await self._repo.get_by_id(license_id)
        if not license_:
            raise ValueError("Licencia no encontrada.")
        
        license_.is_active = not license_.is_active
        return await self._repo.update(license_)


class ListLicensesUseCase:
    def __init__(self, license_repo: ILicenseRepository):
        self._repo = license_repo

    async def execute(
        self,
        status: Optional[str] = None,
        agency_id: Optional[str] = None,
    ) -> List[License]:
        is_ac = True if status == "active" else (False if status == "inactive" else None)
        return await self._repo.list_all(is_active=is_ac, agency_id=agency_id)


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCIAS
# ═══════════════════════════════════════════════════════════════════════════════
class CreateAgencyUseCase:
    def __init__(self, agency_repo: IAgencyRepository):
        self._repo = agency_repo

    async def execute(
        self, name: str
    ) -> Agency:
        agency = Agency(id=None, name=name)
        return await self._repo.create(agency)


class ListAgenciesUseCase:
    def __init__(self, agency_repo: IAgencyRepository):
        self._repo = agency_repo

    async def execute(self) -> List[Agency]:
        return await self._repo.list_all()


# ═══════════════════════════════════════════════════════════════════════════════
# VERSIONES DE APP
# ═══════════════════════════════════════════════════════════════════════════════
class PublishVersionUseCase:
    def __init__(self, version_repo: IAppVersionRepository):
        self._repo = version_repo

    async def execute(
        self,
        version_number: str,
        changelog: str,
        tags: List[str],
        windows_url: str,
        windows_size_kb: int,
        macos_url: str,
        macos_size_kb: int,
    ) -> List[AppVersion]:
        # Logica de mock temporal, desactivacion podria fallar si auth no esta lista.
        results = []
        for platform, url, size in [
            ("windows", windows_url, windows_size_kb),
            ("macos", macos_url, macos_size_kb),
        ]:
            version = AppVersion(
                id=None,
                version_number=version_number,
                platform=platform,
                file_url=url,
                file_size_kb=size,
                changelog=changelog,
                tags=tags,
                is_active=True,
            )
            results.append(await self._repo.create(version))
        return results


class ActivateVersionUseCase:
    def __init__(self, version_repo: IAppVersionRepository):
        self._repo = version_repo

    async def execute(self, version_id: str) -> None:
        version = await self._repo.get_by_id(version_id)
        if not version:
            raise ValueError("Versión no encontrada.")
        # La tabla no tiene activate en el puerto, por ahora mock ok.
        pass


class DeleteVersionUseCase:
    def __init__(self, version_repo: IAppVersionRepository):
        self._repo = version_repo

    async def execute(self, version_id: str) -> None:
        await self._repo.delete(version_id)


class ListVersionsUseCase:
    def __init__(self, version_repo: IAppVersionRepository):
        self._repo = version_repo

    async def execute(self) -> List[AppVersion]:
        return await self._repo.list_all()
