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
    ILicenseRepository, IAgencyRepository, IAppVersionRepository,
    ILeadRepository, IUserRepository
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


class DeleteAgencyUseCase:
    def __init__(self, agency_repo: IAgencyRepository, user_repo: IUserRepository):
        self._repo = agency_repo
        self._user_repo = user_repo

    async def execute(self, agency_id: str, admin_user_id: str, password: str) -> None:
        # 1. Verify admin password
        from app.adapters.security.handlers import PasswordHandler
        admin = await self._user_repo.get_by_id(admin_user_id)
        if not admin or not PasswordHandler.verify(password, admin.password_hash or ""):
            raise ValueError("Contraseña de administrador incorrecta.")
        
        # 2. Delete agency
        await self._repo.delete(agency_id)


class GetAgencyStatsUseCase:
    def __init__(
        self,
        agency_repo: IAgencyRepository,
        license_repo: ILicenseRepository,
        lead_repo: ILeadRepository
    ):
        self._agency_repo = agency_repo
        self._license_repo = license_repo
        self._lead_repo = lead_repo

    async def execute(self, agency_id: str) -> dict:
        agency = await self._agency_repo.get_by_id(agency_id)
        if not agency:
            raise ValueError("Agencia no encontrada.")

        licenses = await self._license_repo.list_all(agency_id=agency_id)
        lic_ids = [str(l.id) for l in licenses]
        
        # 1. Total Agency Stats
        counts = await self._lead_repo.count_by_status_bulk(lic_ids)
        contacted = counts.get("contactado", 0)
        available = counts.get("disponible", 0)
        collected = counts.get("recopilado", 0)
        total = sum(counts.values())

        # 2. Today's stats
        from datetime import timezone
        today_midnight = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_counts = await self._lead_repo.count_under_date(lic_ids, today_midnight)
        today_contacted = today_counts.get("contactado", 0)
        today_collected = sum(today_counts.values()) # count total leads collected today

        # 3. Grouped stats per license
        grouped_counts = await self._lead_repo.count_by_status_grouped_by_license(lic_ids)

        license_details = []
        for lic in licenses:
            lid = str(lic.id)
            lc = grouped_counts.get(lid, {})
            l_contacted = lc.get("contactado", 0)
            l_available = lc.get("disponible", 0)
            l_collected = lc.get("recopilado", 0)
            l_total = sum(lc.values())

            license_details.append({
                "id": lid,
                "key": lic.license_key,
                "recruiter_name": lic.recruiter_name,
                "is_active": lic.is_active,
                "expires_at": lic.expiration_date.isoformat() if lic.expiration_date else None,
                "limit_requests": lic.limit_requests,
                "refresh_minutes": lic.refresh_minutes,
                "stats": {
                    "total": l_total,
                    "contacted": l_contacted,
                    "available": l_available,
                    "collected": l_collected
                }
            })

        return {
            "agency": {
                "id": str(agency.id),
                "name": agency.name,
                "logo_url": agency.logo_url,
            },
            "stats": {
                "total_leads": total,
                "contacted_total": contacted,
                "available_leads": available,
                "collected_leads": collected,
                "today_contacted": today_contacted,
                "today_collected": today_collected,
            },
            "licenses": license_details
        }


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

class VerifyLicenseUseCase:
    """Valida una licencia por su clave (key)."""

    def __init__(self, license_repo: ILicenseRepository):
        self._repo = license_repo

    async def execute(self, key: str) -> Optional[License]:
        license_ = await self._repo.get_by_key(key)
        if not license_ or not license_.is_active:
            return None
        
        # Verificar expiración
        if license_.expiration_date and license_.expiration_date.replace(tzinfo=None) < datetime.utcnow():
            return None
            
        return license_


class RegisterSessionUseCase:
    """Registra o actualiza una sesión de dispositivo para una licencia."""

    def __init__(self, license_repo: ILicenseRepository):
        self._repo = license_repo

    async def execute(
        self,
        license_id: str,
        device_id: str,
        browser_name: Optional[str] = None,
        os_name: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        # Aquí iría la lógica de upsert en license_sessions.
        # Por simplicidad, delegamos al repositorio (que deberá ser actualizado).
        return True
