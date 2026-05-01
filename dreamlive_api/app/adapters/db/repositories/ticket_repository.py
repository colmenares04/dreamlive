from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.ticket import Ticket, TicketMessage
from app.core.ports.ticket_repository import ITicketRepository, ITicketMessageRepository
from app.adapters.db.models import TicketORM, TicketMessageORM


class TicketRepository(ITicketRepository):
    """Implementación SQLAlchemy del repositorio de tickets."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: TicketORM) -> Ticket:
        return Ticket(
            id=str(orm.id),
            agency_id=str(orm.agency_id),
            assigned_to_user_id=str(orm.assigned_to_user_id) if orm.assigned_to_user_id is not None else None,
            subject=orm.subject,
            description=orm.description,
            status=orm.status,
            priority=orm.priority,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
            closed_at=orm.closed_at,
        )

    async def get_by_id(self, ticket_id: str) -> Optional[Ticket]:
        if not ticket_id:
            return None
        result = await self._session.execute(select(TicketORM).where(TicketORM.id == ticket_id))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def list_all(self, agency_id: Optional[str] = None) -> List[Ticket]:
        stmt = select(TicketORM)
        if agency_id:
            stmt = stmt.where(TicketORM.agency_id == agency_id)
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def create(self, ticket: Ticket) -> Ticket:
        orm = TicketORM(
            agency_id=ticket.agency_id,
            assigned_to_user_id=ticket.assigned_to_user_id if ticket.assigned_to_user_id else None,
            subject=ticket.subject,
            description=ticket.description,
            status=ticket.status,
            priority=ticket.priority,
            created_at=ticket.created_at or datetime.utcnow(),
            updated_at=ticket.updated_at or datetime.utcnow(),
            closed_at=ticket.closed_at,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def update(self, ticket: Ticket) -> Ticket:
        if not ticket.id:
            raise ValueError("Ticket ID required to update.")
        result = await self._session.execute(select(TicketORM).where(TicketORM.id == ticket.id))
        orm = result.scalar_one_or_none()
        if not orm:
            raise ValueError(f"Ticket with ID {ticket.id} not found.")

        orm.assigned_to_user_id = ticket.assigned_to_user_id if ticket.assigned_to_user_id else None
        orm.subject = ticket.subject
        orm.description = ticket.description
        orm.status = ticket.status
        orm.priority = ticket.priority
        orm.closed_at = ticket.closed_at
        orm.updated_at = datetime.utcnow()

        await self._session.flush()
        return self._to_domain(orm)

    async def delete(self, ticket_id: str) -> None:
        if not ticket_id:
            return
        result = await self._session.execute(select(TicketORM).where(TicketORM.id == ticket_id))
        orm = result.scalar_one_or_none()
        if orm:
            await self._session.delete(orm)
            await self._session.flush()

    async def get_avg_resolution_time(self) -> float:
        stmt = select(TicketORM).where(TicketORM.closed_at.isnot(None))
        result = await self._session.execute(stmt)
        orms = result.scalars().all()
        if not orms:
            return 0.0

        total_mins = sum(
            (orm.closed_at.replace(tzinfo=None) - orm.created_at.replace(tzinfo=None)).total_seconds() / 60
            for orm in orms if orm.closed_at and orm.created_at
        )
        return total_mins / len(orms)


class TicketMessageRepository(ITicketMessageRepository):
    """Implementación SQLAlchemy del repositorio de mensajes de tickets."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: TicketMessageORM) -> TicketMessage:
        return TicketMessage(
            id=str(orm.id),
            ticket_id=str(orm.ticket_id),
            user_id=str(orm.user_id),
            message=orm.message,
            created_at=orm.created_at,
        )

    async def list_by_ticket(self, ticket_id: str) -> List[TicketMessage]:
        if not ticket_id:
            return []
        stmt = select(TicketMessageORM).where(TicketMessageORM.ticket_id == ticket_id).order_by(TicketMessageORM.created_at.asc())
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def create(self, message: TicketMessage) -> TicketMessage:
        orm = TicketMessageORM(
            ticket_id=message.ticket_id,
            user_id=message.user_id,
            message=message.message,
            created_at=message.created_at or datetime.utcnow(),
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)
