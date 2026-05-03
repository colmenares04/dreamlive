"""
Barrel de entidades de dominio.

Importa únicamente desde aquí para mantener compatibilidad con los
routers y casos de uso existentes durante el proceso de refactorización.
El archivo models.py en este mismo directorio está DEPRECADO.
"""
from app.core.entities.agency import Agency
from app.core.entities.license import License, LicenseSession, LicenseStatus
from app.core.entities.lead import Lead, LeadStatus
from app.core.entities.ticket import Ticket, TicketMessage, TicketStatus, TicketPriority
from app.core.entities.audit_log import AuditLog
from app.core.entities.app_version import AppVersion, Platform, VersionTag
from app.core.entities.user import User, UserRole, UserStatus
from app.core.entities.notification import Notification

__all__ = [
    "Agency",
    "License", "LicenseSession", "LicenseStatus",
    "Lead", "LeadStatus",
    "Ticket", "TicketMessage", "TicketStatus", "TicketPriority",
    "AuditLog",
    "AppVersion", "Platform", "VersionTag",
    "User", "UserRole", "UserStatus",
    "Notification",
]
