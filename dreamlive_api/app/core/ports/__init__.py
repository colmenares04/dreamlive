"""
Barrel de puertos (interfaces) del dominio.

Importa únicamente desde aquí para mantener compatibilidad.
El archivo repositories.py en este mismo directorio está DEPRECADO.
"""
from app.core.ports.user_repository import IUserRepository
from app.core.ports.agency_repository import IAgencyRepository
from app.core.ports.license_repository import ILicenseRepository
from app.core.ports.lead_repository import ILeadRepository
from app.core.ports.ticket_repository import ITicketRepository, ITicketMessageRepository
from app.core.ports.audit_log_repository import IAuditLogRepository
from app.core.ports.app_version_repository import IAppVersionRepository

__all__ = [
    "IUserRepository",
    "IAgencyRepository",
    "ILicenseRepository",
    "ILeadRepository",
    "ITicketRepository",
    "ITicketMessageRepository",
    "IAuditLogRepository",
    "IAppVersionRepository",
]
