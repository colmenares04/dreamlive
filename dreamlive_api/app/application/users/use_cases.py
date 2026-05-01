"""
Casos de uso: Usuarios, Tickets y Auditoría.

Agrupa la lógica de gestión administrativa y soporte del sistema.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.core.entities.ticket import Ticket
from app.core.entities.audit_log import AuditLog
from app.core.entities.user import User, UserRole
from app.core.ports.unit_of_work import IUnitOfWork
from app.core.ports.security import IPasswordHasher
from app.core.domain.exceptions import UserNotFound, ForbiddenAction, EntityNotFound


# ═══════════════════════════════════════════════════════════════════════════════
# USUARIOS (GESTIÓN)
# ═══════════════════════════════════════════════════════════════════════════════
class ListTicketsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self, 
        current_user_role: UserRole,
        current_user_agency_id: Optional[str],
        status_filter: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> List[Ticket]:
        if current_user_role == UserRole.SUPERUSER:
            tickets = await self._uow.tickets.list_all()
        else:
            tickets = await self._uow.tickets.list_all(agency_id=current_user_agency_id)

        filtered = [t for t in tickets if not status_filter or t.status == status_filter]
        if assigned_to:
            filtered = [t for t in filtered if t.assigned_to_user_id == assigned_to]
        return filtered


class CreateTicketUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self,
        subject: str,
        description: str,
        priority: str,
        current_user: User,
        agency_id: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> Ticket:
        # Forzar agency_id del usuario si no es superuser
        effective_agency_id = str(current_user.agency_id) if current_user.agency_id else None
        if current_user.role == UserRole.SUPERUSER and agency_id:
            effective_agency_id = agency_id

        ticket = Ticket(
            id=None,
            agency_id=effective_agency_id,
            assigned_to_user_id=assigned_to,
            subject=subject,
            description=description,
            status="open",
            priority=priority,
        )
        async with self._uow:
            created = await self._uow.tickets.create(ticket)
            await self._uow.commit()
            return created


class UpdateTicketStatusUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, ticket_id: str, new_status: str, current_user: User) -> Ticket:
        async with self._uow:
            ticket = await self._uow.tickets.get_by_id(ticket_id)
            if not ticket:
                raise EntityNotFound("Ticket no encontrado.")
            
            if current_user.role != UserRole.SUPERUSER and ticket.agency_id != current_user.agency_id:
                raise ForbiddenAction("Acceso denegado al ticket.")

            ticket.status = new_status
            if new_status == 'closed':
                ticket.closed_at = datetime.now(timezone.utc)
            else:
                ticket.closed_at = None

            updated = await self._uow.tickets.update(ticket)
            await self._uow.commit()
            return updated


class DeleteTicketUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, ticket_id: str) -> None:
        async with self._uow:
            await self._uow.tickets.delete(ticket_id)
            await self._uow.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# AUDITORÍA
# ═══════════════════════════════════════════════════════════════════════════════
class ListAuditLogsUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, agency_id: Optional[str] = None, category: Optional[str] = None, limit: int = 100) -> List[AuditLog]:
        return await self._uow.audit_logs.list_all(agency_id=agency_id) # El repo ya debería manejar filtros


class CreateAuditLogUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, **kwargs) -> AuditLog:
        log = AuditLog(id=None, created_at=datetime.now(timezone.utc), **kwargs)
        async with self._uow:
            created = await self._uow.audit_logs.create(log)
            await self._uow.commit()
            return created
