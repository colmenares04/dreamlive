"""
Barrel de repositorios concretos.

Importa únicamente desde aquí para mantener compatibilidad.
El archivo all_repos.py está DEPRECADO y será eliminado.
"""
from app.adapters.db.repositories.agency_repository import AgencyRepository
from app.adapters.db.repositories.user_repository import UserRepository
from app.adapters.db.repositories.license_repository import LicenseRepository
from app.adapters.db.repositories.lead_repository import LeadRepository
from app.adapters.db.repositories.ticket_repository import TicketRepository, TicketMessageRepository
from app.adapters.db.repositories.audit_log_repository import AuditLogRepository
from app.adapters.db.repositories.app_version_repository import AppVersionRepository

__all__ = [
    "AgencyRepository",
    "UserRepository",
    "LicenseRepository",
    "LeadRepository",
    "TicketRepository",
    "TicketMessageRepository",
    "AuditLogRepository",
    "AppVersionRepository",
]
