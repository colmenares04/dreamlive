"""
Implementación concreta del Unit of Work para SQLAlchemy.
Gestiona el ciclo de vida de la transacción y la sesión asíncrona.
"""
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.ports.unit_of_work import IUnitOfWork
from app.adapters.db.repositories import (
    AgencyRepository,
    LicenseRepository,
    LeadRepository,
    TicketRepository,
    TicketMessageRepository,
    AuditLogRepository,
    AppVersionRepository,
    UserRepository,
)


class SqlAlchemyUnitOfWork(IUnitOfWork):
    """
    UoW concreto que instancia todos los repositorios con una sesión asíncrona.
    
    Uso:
        async with SqlAlchemyUnitOfWork(async_session) as uow:
            agency = await uow.agencies.get_by_id(id)
            await uow.commit()
    """

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory
        self.session: Optional[AsyncSession] = None

    async def __aenter__(self) -> "SqlAlchemyUnitOfWork":
        # Creamos una sesión nueva a partir del sessionmaker
        self.session = self.session_factory()
        
        # Inyectamos la sesión en todos los repositorios
        self.agencies = AgencyRepository(self.session)
        self.licenses = LicenseRepository(self.session)
        self.leads = LeadRepository(self.session)
        self.tickets = TicketRepository(self.session)
        self.ticket_messages = TicketMessageRepository(self.session)
        self.audit_logs = AuditLogRepository(self.session)
        self.app_versions = AppVersionRepository(self.session)
        self.users = UserRepository(self.session)

        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        try:
            if exc_type is not None:
                await self.rollback()
            else:
                await self.commit()
        finally:
            if self.session is not None:
                await self.session.close()

    async def commit(self) -> None:
        """Confirma los cambios de la unidad de trabajo."""
        if self.session is not None:
            await self.session.commit()

    async def rollback(self) -> None:
        """Revierte los cambios de la unidad de trabajo."""
        if self.session is not None:
            await self.session.rollback()
