"""
Puerto (interfaz) del patrón Unit of Work.

Define el contrato para acceder a todos los repositorios
bajo un contexto coordinado. La implementación concreta
vive en la capa de Adapters.
"""
from abc import ABC, abstractmethod
from typing import Any

from app.core.ports.agency_repository import IAgencyRepository
from app.core.ports.license_repository import ILicenseRepository
from app.core.ports.lead_repository import ILeadRepository
from app.core.ports.ticket_repository import ITicketRepository, ITicketMessageRepository
from app.core.ports.audit_log_repository import IAuditLogRepository
from app.core.ports.app_version_repository import IAppVersionRepository


class IUnitOfWork(ABC):
    """
    Contrato del Unit of Work.

    Agrupa todos los repositorios bajo un único punto de acceso
    y gestiona el ciclo de vida de la unidad de trabajo.
    Usar como async context manager:

        async with uow:
            agency = await uow.agencies.get_by_id(id)
            await uow.commit()
    """

    agencies: IAgencyRepository
    licenses: ILicenseRepository
    leads: ILeadRepository
    tickets: ITicketRepository
    ticket_messages: ITicketMessageRepository
    audit_logs: IAuditLogRepository
    app_versions: IAppVersionRepository

    @abstractmethod
    async def __aenter__(self) -> "IUnitOfWork": ...

    @abstractmethod
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None: ...

    @abstractmethod
    async def commit(self) -> None:
        """Confirma los cambios de la unidad de trabajo."""
        ...

    @abstractmethod
    async def rollback(self) -> None:
        """Revierte los cambios de la unidad de trabajo."""
        ...
