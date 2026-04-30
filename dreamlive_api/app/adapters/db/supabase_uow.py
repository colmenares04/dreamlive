"""
Implementación concreta del Unit of Work para Supabase.

Nota: Supabase REST API no soporta transacciones reales.
commit() y rollback() son no-ops por diseño. El valor del UoW
aquí es agrupar todos los repos bajo un único contexto compartido
y garantizar que todos operen sobre el mismo Client.
"""
from typing import Any

from supabase import Client

from app.core.ports.unit_of_work import IUnitOfWork
from app.adapters.db.repositories.agency_repository import AgencyRepository
from app.adapters.db.repositories.license_repository import LicenseRepository
from app.adapters.db.repositories.lead_repository import LeadRepository
from app.adapters.db.repositories.ticket_repository import TicketRepository, TicketMessageRepository
from app.adapters.db.repositories.audit_log_repository import AuditLogRepository
from app.adapters.db.repositories.app_version_repository import AppVersionRepository


class SupabaseUnitOfWork(IUnitOfWork):
    """
    UoW concreto que instancia todos los repos con el mismo Client Supabase.

    Uso:
        async with SupabaseUnitOfWork(db) as uow:
            agency = await uow.agencies.get_by_id(id)
            await uow.commit()
    """

    def __init__(self, db: Client) -> None:
        self._db = db
        self.agencies = AgencyRepository(self._db)
        self.licenses = LicenseRepository(self._db)
        self.leads = LeadRepository(self._db)
        self.tickets = TicketRepository(self._db)
        self.ticket_messages = TicketMessageRepository(self._db)
        self.audit_logs = AuditLogRepository(self._db)
        self.app_versions = AppVersionRepository(self._db)

    async def __aenter__(self) -> "SupabaseUnitOfWork":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_type is not None:
            await self.rollback()

    async def commit(self) -> None:
        # Supabase REST no soporta transacciones.
        # Cada operación de repo se confirma individualmente.
        pass

    async def rollback(self) -> None:
        # No-op para Supabase REST.
        pass
