"""
Casos de uso: Licencias, Agencias, Versiones de App.

Reglas:
  - CERO imports de app.adapters (Dependency Rule).
  - Dependencias inyectadas via constructor (puertos del Core).
  - Excepciones de dominio tipadas (no ValueError).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.entities.agency import Agency
from app.core.entities.license import License
from app.core.entities.app_version import AppVersion
from app.core.entities.lead import LeadStatus
from app.core.ports.unit_of_work import IUnitOfWork
from app.core.ports.security import IPasswordHasher
from app.core.domain.exceptions import (
    LicenseNotFound,
    AgencyNotFound,
    EntityNotFound,
    InvalidCredentials,
)
from app.core.ports.cache import ICacheService
from app.core.ports.realtime import IRealTimeGateway


# ═══════════════════════════════════════════════════════════════════════════════
# LICENCIAS
# ═══════════════════════════════════════════════════════════════════════════════
class CreateLicenseUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

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
        async with self._uow:
            created = await self._uow.licenses.create(new_license)
            await self._uow.commit()
            return created


class ExtendLicenseUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str, days: int) -> License:
        async with self._uow:
            license_ = await self._uow.licenses.get_by_id(license_id)
            if not license_:
                raise LicenseNotFound()

            base = license_.expiration_date if license_.expiration_date else datetime.now(timezone.utc)
            license_.expiration_date = base + timedelta(days=days)
            license_.is_active = True
            updated = await self._uow.licenses.update(license_)
            await self._uow.commit()
            return updated


class ToggleLicenseUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str) -> License:
        async with self._uow:
            license_ = await self._uow.licenses.get_by_id(license_id)
            if not license_:
                raise LicenseNotFound()

            license_.is_active = not license_.is_active
            updated = await self._uow.licenses.update(license_)
            await self._uow.commit()
            return updated


class ListLicensesUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        status: Optional[str] = None,
        agency_id: Optional[str] = None,
    ) -> List[License]:
        is_ac = True if status == "active" else (False if status == "inactive" else None)
        return await self._uow.licenses.list_all(is_active=is_ac, agency_id=agency_id)


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCIAS
# ═══════════════════════════════════════════════════════════════════════════════
class CreateAgencyUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, name: str) -> Agency:
        agency = Agency(id=None, name=name)
        async with self._uow:
            created = await self._uow.agencies.create(agency)
            await self._uow.commit()
            return created


class ListAgenciesUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self) -> List[Agency]:
        return await self._uow.agencies.list_all()


class DeleteAgencyUseCase:
    """Elimina una agencia tras verificar la contraseña del admin."""

    def __init__(
        self,
        uow: IUnitOfWork,
    ):
        self._uow = uow

    async def execute(self, agency_id: str, password: str) -> None:
        agency = await self._uow.agencies.get_by_id(agency_id)
        if not agency or agency.password != password:
            raise InvalidCredentials("Contraseña de agencia incorrecta.")

        async with self._uow:
            await self._uow.agencies.delete(agency_id)
            await self._uow.commit()


class GetAgencyStatsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: str) -> dict:
        agency = await self._uow.agencies.get_by_id(agency_id)
        if not agency:
            raise AgencyNotFound()

        licenses = await self._uow.licenses.list_all(agency_id=agency_id)
        lic_ids = [str(lic.id) for lic in licenses]

        # 1. Total Agency Stats
        counts = await self._uow.leads.count_by_status_bulk(lic_ids)
        contacted = counts.get(LeadStatus.CONTACTED, 0)
        available = counts.get(LeadStatus.AVAILABLE, 0)
        collected = counts.get(LeadStatus.COLLECTED, 0)
        total = sum(counts.values())

        # 2. Today's stats
        today_midnight = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_counts = await self._uow.leads.count_under_date(lic_ids, today_midnight)
        today_contacted = today_counts.get(LeadStatus.CONTACTED, 0)
        today_collected = sum(today_counts.values())

        # 3. Grouped stats per license
        grouped_counts = await self._uow.leads.count_by_status_grouped_by_license(lic_ids)

        license_details = []
        for lic in licenses:
            lid = str(lic.id)
            lc = grouped_counts.get(lid, {})
            l_contacted = lc.get(LeadStatus.CONTACTED, 0)
            l_available = lc.get(LeadStatus.AVAILABLE, 0)
            l_collected = lc.get(LeadStatus.COLLECTED, 0)
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
                    "collected": l_collected,
                },
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
            "licenses": license_details,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# VERSIONES DE APP
# ═══════════════════════════════════════════════════════════════════════════════
class PublishVersionUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

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
        results = []
        async with self._uow:
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
                results.append(await self._uow.app_versions.create(version))
            await self._uow.commit()
        return results


class ActivateVersionUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, version_id: str) -> None:
        version = await self._uow.app_versions.get_by_id(version_id)
        if not version:
            raise EntityNotFound("Versión no encontrada.")


class DeleteVersionUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, version_id: str) -> None:
        async with self._uow:
            await self._uow.app_versions.delete(version_id)
            await self._uow.commit()


class ListVersionsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self) -> List[AppVersion]:
        return await self._uow.app_versions.list_all()


class VerifyLicenseUseCase:
    """Valida una licencia por su clave (key)."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, key: str) -> Optional[License]:
        license_ = await self._uow.licenses.get_by_key(key)
        if not license_ or not license_.is_active:
            return None

        if license_.expiration_date and license_.expiration_date.replace(tzinfo=None) < datetime.utcnow():
            return None

        return license_


class RegisterSessionUseCase:
    """
    Registra una sesión de dispositivo para una licencia.
    Controla el límite de dispositivos y expulsa la sesión más antigua si es necesario.
    """

    def __init__(self, uow: IUnitOfWork, cache: ICacheService, gateway: IRealTimeGateway):
        self._uow = uow
        self._cache = cache
        self._gateway = gateway

    async def execute(
        self,
        license_id: str,
        device_id: str,
        browser_name: Optional[str] = None,
        os_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> str:
        """
        Retorna el session_id generado para la nueva conexión.
        Si se supera el límite, expulsa al dispositivo más antiguo vía WS.
        """
        async with self._uow:
            lic = await self._uow.licenses.get_by_id(license_id)
            if not lic or not lic.is_active:
                raise LicenseNotFound("Licencia inválida o inactiva.")

            # 1. Obtener sesiones actuales de Redis (Almacenadas como Lista o Hash)
            cache_key = f"license:sessions:{license_id}"
            active_sessions = await self._cache.get(cache_key) or [] # Formato: [{"id": "...", "ts": ...}]
            
            # Generar nuevo ID de sesión (UUID válido para DB)
            new_session_id = str(uuid.uuid4())

            # 2. Verificar Límite y Evicción
            if len(active_sessions) >= lic.max_devices:
                # Identificar la sesión más antigua (primer elemento si mantenemos orden)
                # Ordenamos por timestamp por seguridad
                active_sessions.sort(key=lambda x: x.get("ts", 0))
                
                oldest_session = active_sessions.pop(0)
                old_session_id = oldest_session.get("id")

                # Emitir evento de expulsión vía Gateway RealTime
                if old_session_id:
                    await self._gateway.emit_to_session(
                        session_id=old_session_id,
                        event="FORCE_LOGOUT",
                        payload={"reason": "device_limit_exceeded"}
                    )
            
            # 3. Registrar nueva sesión en la lista
            active_sessions.append({
                "id": new_session_id,
                "ts": int(datetime.utcnow().timestamp()),
                "device": device_id
            })

            # 4. Persistir en Redis y DB
            await self._cache.set(cache_key, active_sessions, ttl_seconds=86400) # Expira en 24h de inactividad
            
            # Registrar sesión en la DB
            await self._uow.licenses.upsert_session(
                license_id=license_id,
                session_id=new_session_id,
                device_id=device_id,
                browser_name=browser_name,
                os_name=os_name,
                ip_address=ip_address
            )
            
            await self._uow.commit()
            return new_session_id


class UpdateLicenseConfigUseCase:
    """Actualiza la configuración técnica de una licencia."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        license_id: str,
        recruiter_name: Optional[str] = None,
        admin_password: Optional[str] = None,
        request_limit: Optional[int] = None,
        refresh_minutes: Optional[int] = None,
        keywords: Optional[str] = None,
        message_templates: Optional[List[str]] = None,
        invitation_types: Optional[List[str]] = None,
    ) -> License:
        async with self._uow:
            lic = await self._uow.licenses.get_by_id(license_id)
            if not lic:
                raise LicenseNotFound()

            if recruiter_name is not None: lic.recruiter_name = recruiter_name
            if admin_password is not None: lic.admin_password = admin_password
            if request_limit is not None: lic.limit_requests = request_limit
            if refresh_minutes is not None: lic.refresh_minutes = refresh_minutes
            if keywords is not None: lic.keywords = keywords
            if message_templates is not None: lic.message_templates = message_templates
            if invitation_types is not None: lic.invitation_types = invitation_types

            updated = await self._uow.licenses.update(lic)
            await self._uow.commit()
            return updated


class SyncLicensePasswordsUseCase:
    """Sincroniza la contraseña de administrador en todas las licencias de una agencia."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: str, password: str) -> int:
        async with self._uow:
            count = await self._uow.licenses.bulk_update_password(agency_id, password)
            await self._uow.commit()
            return count


class UpdateLicenseDateUseCase:
    """Actualiza la fecha de vencimiento de una licencia de manera manual."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str, new_date: datetime) -> None:
        async with self._uow:
            await self._uow.licenses.update_date(license_id, new_date)
            await self._uow.commit()


class DeleteLicenseUseCase:
    """Elimina físicamente una licencia."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_id: str) -> None:
        async with self._uow:
            await self._uow.licenses.delete(license_id)
            await self._uow.commit()


class GetAgencyPermissionsUseCase:
    """Obtiene los permisos configurados para una agencia."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: str) -> dict:
        agency = await self._uow.agencies.get_by_id(agency_id)
        if not agency:
            raise AgencyNotFound()
        return agency.role_permissions


class UpdateAgencyPermissionsUseCase:
    """Actualiza los permisos de roles para una agencia."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: str, permissions: dict) -> dict:
        async with self._uow:
            agency = await self._uow.agencies.get_by_id(agency_id)
            if not agency:
                raise AgencyNotFound()
            agency.role_permissions = permissions
            await self._uow.agencies.update(agency)
            await self._uow.commit()
            return agency.role_permissions


class LinkLicenseUseCase:
    """Vincula un email/password y nombre a una licencia que no los tiene asignados."""
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, license_key: str, email: str, password: str, full_name: str) -> License:
        async with self._uow:
            lic = await self._uow.licenses.get_by_key(license_key)
            if not lic:
                raise LicenseNotFound()
            
            if lic.email:
                raise InvalidCredentials("Esta licencia ya se encuentra vinculada a un correo.")

            # Buscar si el email ya est en uso
            existing = await self._uow.licenses.get_by_email(email)
            if existing:
                raise InvalidCredentials("Este correo ya esta en uso por otra licencia.")

            lic.email = email
            lic.admin_password = password
            lic.full_name = full_name
            updated = await self._uow.licenses.update(lic)
            await self._uow.commit()
            return updated


class LoginExtensionUseCase:
    """Inicia sesion en la extension usando email y password, retornando la licencia."""
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, email: str, password: str) -> License:
        lic = await self._uow.licenses.get_by_email(email)
        if not lic:
            raise LicenseNotFound()
        
        if lic.admin_password != password:
            raise InvalidCredentials("Contrasena incorrecta.")
            
        if not lic.is_valid():
            raise InvalidCredentials("Licencia inactiva o expirada.")

        return lic
