"""
Casos de uso: Usuarios, Tickets y Auditoría.

Agrupa la lógica de gestión administrativa y soporte del sistema.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.core.entities.user import User, UserRole, UserStatus
from app.core.entities.ticket import Ticket
from app.core.entities.audit_log import AuditLog
from app.core.ports.unit_of_work import IUnitOfWork
from app.core.ports.security import IPasswordHasher
from app.core.domain.exceptions import UserNotFound, ForbiddenAction, EntityNotFound


# ═══════════════════════════════════════════════════════════════════════════════
# USUARIOS (GESTIÓN)
# ═══════════════════════════════════════════════════════════════════════════════
class ListUsersUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(
        self, 
        current_user_role: UserRole,
        current_user_agency_id: Optional[str],
        agency_id: Optional[str] = None
    ) -> List[User]:
        # Si no es superuser, forzar su propia agencia
        if current_user_role != UserRole.SUPERUSER:
            if not current_user_agency_id:
                return []
            agency_id = current_user_agency_id
        
        users = await self._uow.users.list_all(agency_id=agency_id)
        
        # Filtro de seguridad: No-superusers no ven superusers
        if current_user_role != UserRole.SUPERUSER:
            users = [u for u in users if u.role != UserRole.SUPERUSER]
            
        return users


class UpdateUserUseCase:
    def __init__(self, uow: IUnitOfWork, password_hasher: IPasswordHasher):
        self._uow = uow
        self._hasher = password_hasher

    async def execute(
        self,
        user_id: str,
        current_user: User,
        username: Optional[str] = None,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
        password: Optional[str] = None,
        agency_id: Optional[str] = None,
        full_name: Optional[str] = None
    ) -> User:
        async with self._uow:
            user = await self._uow.users.get_by_id(user_id)
            if not user:
                raise UserNotFound()

            # Seguridad: Verificar propiedad si no es superuser
            if current_user.role != UserRole.SUPERUSER and user.agency_id != current_user.agency_id:
                raise ForbiddenAction("No tienes permiso para editar este usuario.")

            if username is not None: user.username = username
            if full_name is not None: user.username = full_name # En este dominio full_name se mapea a username a veces
            if status is not None: user.status = status
            
            # Solo superuser puede cambiar roles o mover de agencia
            if current_user.role == UserRole.SUPERUSER:
                if role is not None: user.role = role
                if agency_id is not None: user.agency_id = agency_id
            
            if password is not None:
                user.password_hash = self._hasher.hash(password)

            updated = await self._uow.users.update(user)
            await self._uow.commit()
            return updated


class DeleteUserUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, user_id: str, current_user: User) -> None:
        async with self._uow:
            user = await self._uow.users.get_by_id(user_id)
            if not user:
                return

            if current_user.role != UserRole.SUPERUSER and user.agency_id != current_user.agency_id:
                raise ForbiddenAction("No tienes permiso para eliminar este usuario.")

            await self._uow.users.delete(user_id)
            await self._uow.commit()


class InviteUserUseCase:
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, email: str, role: str, agency_id: Optional[str]) -> User:
        user = User(
            id=None,
            email=email,
            username=email.split("@")[0],
            role=UserRole(role),
            agency_id=agency_id,
            status=UserStatus.PENDING,
            password_hash=None # Se establecerá al aceptar la invitación
        )
        async with self._uow:
            created = await self._uow.users.create(user)
            await self._uow.commit()
            return created


# ═══════════════════════════════════════════════════════════════════════════════
# TICKETS (SOPORTE)
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
