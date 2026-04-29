"""
Puertos (interfaces) para Ticket y TicketMessage.

Pertenecen a la capa Core. Solo definen el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from app.core.entities.ticket import Ticket, TicketMessage


class ITicketRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de tickets."""

    @abstractmethod
    async def get_by_id(self, ticket_id: str) -> Optional[Ticket]: ...

    @abstractmethod
    async def list_all(self, agency_id: Optional[str] = None) -> List[Ticket]: ...

    @abstractmethod
    async def create(self, ticket: Ticket) -> Ticket: ...

    @abstractmethod
    async def update(self, ticket: Ticket) -> Ticket: ...

    @abstractmethod
    async def delete(self, ticket_id: str) -> None: ...

    @abstractmethod
    async def get_avg_resolution_time(self) -> float:
        """Retorna el tiempo promedio de resolución en minutos."""
        ...


class ITicketMessageRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de mensajes de ticket."""

    @abstractmethod
    async def list_by_ticket(self, ticket_id: str) -> List[TicketMessage]: ...

    @abstractmethod
    async def create(self, message: TicketMessage) -> TicketMessage: ...
