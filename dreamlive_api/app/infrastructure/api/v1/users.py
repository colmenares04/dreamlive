"""
Rutas de usuarios, tickets y auditoría.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import (
    UserRepository, TicketRepository, AuditLogRepository
)
from app.application.auth.use_cases import CreateUserInput, CreateUserUseCase
from app.adapters.security.handlers import PasswordHandler
from app.core.entities.models import Ticket, AuditLog
from app.core.entities.user import User, UserRole, UserStatus
from app.infrastructure.api.deps import (
    get_current_user,
    require_admin,
    require_agency_group,
    require_owner_or_admin,
)


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: str | None
    email: str
    username: str
    full_name: str
    role: str
    status: str
    agency_id: str | None


class CreateUserBody(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: UserRole
    agency_id: Optional[str] = None


class UpdateUserBody(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None
    agency_id: Optional[str] = None


class TicketOut(BaseModel):
    id: str | None
    agency_id: str | None
    assigned_to_user_id: str | None
    subject: str
    description: str
    status: str
    priority: str
    created_at: Optional[str]
    updated_at: Optional[str]
    closed_at: Optional[str]


class CreateTicketBody(BaseModel):
    subject: str
    description: str
    priority: str = "medium"
    assigned_to_user_id: Optional[str] = None
    agency_id: Optional[str] = None


class UpdateTicketBody(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    closed_at: Optional[datetime] = None


class AuditLogOut(BaseModel):
    id: str | None
    user_id: str | None
    agency_id: str | None
    category: str
    action: str
    entity_name: str | None
    entity_id: str | None
    old_data: Optional[dict]
    new_data: Optional[dict]
    ip_address: str | None
    created_at: Optional[str]


class CreateAuditLogBody(BaseModel):
    user_id: Optional[str] = None
    agency_id: Optional[str] = None
    category: str
    action: str
    entity_name: Optional[str] = None
    entity_id: Optional[str] = None
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    ip_address: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
users_router = APIRouter(prefix="/users", tags=["Users"])
tickets_router = APIRouter(prefix="/tickets", tags=["Tickets"])
audit_router = APIRouter(prefix="/audit", tags=["AuditLogs"])


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────
@users_router.get("/", dependencies=[Depends(require_owner_or_admin)])
async def list_users(
    agency_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    repo = UserRepository(db)
    
    # Force filtering by agency_id if not a superuser
    if current_user.role != UserRole.SUPERUSER:
        if not current_user.agency_id:
            return []
        agency_id = str(current_user.agency_id)
    
    users = await repo.list_all(agency_id=agency_id)
    return [
        UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.username,
            role=user.role.value,
            status=user.status.value,
            agency_id=user.agency_id,
        ) for user in users
    ]


@users_router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_owner_or_admin)])
async def create_user(
    body: CreateUserBody, 
    current_user: User = Depends(get_current_user), 
    db: Client = Depends(get_db)
):
    repo = UserRepository(db)
    use_case = CreateUserUseCase(repo)
    
    # Prioritizes body.agency_id, then falls back to current_user.agency_id
    effective_agency_id = body.agency_id
    if not effective_agency_id:
        effective_agency_id = str(current_user.agency_id) if current_user.agency_id else None
        
    try:
        result = await use_case.execute(
            CreateUserInput(
                email=body.email,
                username=body.username,
                password=body.password,
                role=body.role,
                agency_id=effective_agency_id,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    user = result.user
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.username,
        role=user.role.value,
        status=user.status.value,
        agency_id=user.agency_id,
    )


@users_router.patch("/{user_id}", dependencies=[Depends(require_owner_or_admin)])
async def update_user(
    user_id: str, 
    body: UpdateUserBody, 
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    # Check ownership if not superuser
    if current_user.role != UserRole.SUPERUSER and user.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para editar este usuario.")

    if body.username is not None:
        user.username = body.username
    if body.role is not None:
        user.role = body.role
    if body.status is not None:
        user.status = body.status
    if body.agency_id is not None and current_user.role == UserRole.SUPERUSER:
        user.agency_id = body.agency_id
    if body.password is not None:
        user.password_hash = PasswordHandler.hash(body.password)

    updated = await repo.update(user)
    return UserOut(
        id=updated.id,
        email=updated.email,
        username=updated.username,
        full_name=updated.username,
        role=updated.role.value,
        status=updated.status.value,
        agency_id=updated.agency_id,
    )


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_owner_or_admin)])
async def delete_user(
    user_id: str, 
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        return None # Idempotent delete

    # Check ownership if not superuser
    if current_user.role != UserRole.SUPERUSER and user.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para eliminar este usuario.")

    await repo.delete(user_id)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Tickets
# ─────────────────────────────────────────────────────────────────────────────
@tickets_router.get("/", dependencies=[Depends(require_agency_group)])
async def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to: Optional[str] = Query(None, alias="assigned_to"),
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    repo = TicketRepository(db)
    if current_user.role == UserRole.SUPERUSER:
        tickets = await repo.list_all()
    else:
        tickets = await repo.list_all(agency_id=current_user.agency_id)

    filtered = [t for t in tickets if not status_filter or t.status == status_filter]
    if assigned_to:
        filtered = [t for t in filtered if t.assigned_to_user_id == assigned_to]

    return [
        TicketOut(
            id=t.id,
            agency_id=t.agency_id,
            assigned_to_user_id=t.assigned_to_user_id,
            subject=t.subject,
            description=t.description,
            status=t.status,
            priority=t.priority,
            created_at=t.created_at.isoformat() if t.created_at else None,
            updated_at=t.updated_at.isoformat() if t.updated_at else None,
            closed_at=t.closed_at.isoformat() if t.closed_at else None,
        ) for t in filtered
    ]


@tickets_router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_agency_group)])
async def create_ticket(body: CreateTicketBody, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = TicketRepository(db)
    # [SECURITY] Force own agency_id to prevent IDOR
    effective_agency_id = str(current_user.agency_id) if current_user.agency_id else None
    if current_user.role == UserRole.SUPERUSER and body.agency_id:
        effective_agency_id = body.agency_id

    ticket = Ticket(
        id=None,
        agency_id=effective_agency_id,
        assigned_to_user_id=body.assigned_to_user_id,
        subject=body.subject,
        description=body.description,
        status="open",
        priority=body.priority,
    )
    created = await repo.create(ticket)
    return TicketOut(
        id=created.id,
        agency_id=created.agency_id,
        assigned_to_user_id=created.assigned_to_user_id,
        subject=created.subject,
        description=created.description,
        status=created.status,
        priority=created.priority,
        created_at=created.created_at.isoformat() if created.created_at else None,
        updated_at=created.updated_at.isoformat() if created.updated_at else None,
        closed_at=created.closed_at.isoformat() if created.closed_at else None,
    )


@tickets_router.patch("/{ticket_id}", dependencies=[Depends(require_agency_group)])
async def update_ticket(ticket_id: str, body: UpdateTicketBody, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = TicketRepository(db)
    ticket = await repo.get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado.")
    if current_user.role != UserRole.SUPERUSER and ticket.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado al ticket.")

    if body.subject is not None:
        ticket.subject = body.subject
    if body.description is not None:
        ticket.description = body.description
    if body.status is not None:
        ticket.status = body.status
    if body.priority is not None:
        ticket.priority = body.priority
    if body.assigned_to_user_id is not None:
        ticket.assigned_to_user_id = body.assigned_to_user_id
    if body.closed_at is not None:
        ticket.closed_at = body.closed_at

    updated = await repo.update(ticket)
    return TicketOut(
        id=updated.id,
        agency_id=updated.agency_id,
        assigned_to_user_id=updated.assigned_to_user_id,
        subject=updated.subject,
        description=updated.description,
        status=updated.status,
        priority=updated.priority,
        created_at=updated.created_at.isoformat() if updated.created_at else None,
        updated_at=updated.updated_at.isoformat() if updated.updated_at else None,
        closed_at=updated.closed_at.isoformat() if updated.closed_at else None,
    )


@tickets_router.patch("/{ticket_id}/status", dependencies=[Depends(require_agency_group)])
async def update_ticket_status(ticket_id: str, body: dict, current_user: User = Depends(get_current_user), db: Client = Depends(get_db)):
    repo = TicketRepository(db)
    ticket = await repo.get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado.")
    
    # Check permissions
    if current_user.role != UserRole.SUPERUSER and ticket.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado al ticket.")

    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Se requiere el campo 'status'")

    ticket.status = new_status
    if new_status == 'closed':
        ticket.closed_at = datetime.utcnow()
    else:
        # Si se reabre, limpiamos la fecha de cierre
        ticket.closed_at = None

    updated = await repo.update(ticket)
    return TicketOut(
        id=updated.id,
        agency_id=updated.agency_id,
        assigned_to_user_id=updated.assigned_to_user_id,
        subject=updated.subject,
        description=updated.description,
        status=updated.status,
        priority=updated.priority,
        created_at=updated.created_at.isoformat() if updated.created_at else None,
        updated_at=updated.updated_at.isoformat() if updated.updated_at else None,
        closed_at=updated.closed_at.isoformat() if updated.closed_at else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Audit logs
# ─────────────────────────────────────────────────────────────────────────────
@audit_router.get("/", dependencies=[Depends(require_admin)])
async def list_audit_logs(agency_id: Optional[str] = None, db: Client = Depends(get_db)):
    repo = AuditLogRepository(db)
    logs = await repo.list_all(agency_id=agency_id)
    return [
        AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            agency_id=log.agency_id,
            category=log.category,
            action=log.action,
            entity_name=log.entity_name,
            entity_id=log.entity_id,
            old_data=log.old_data,
            new_data=log.new_data,
            ip_address=log.ip_address,
            created_at=log.created_at.isoformat() if log.created_at else None,
        ) for log in logs
    ]


@audit_router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_audit_log(body: CreateAuditLogBody, db: Client = Depends(get_db)):
    repo = AuditLogRepository(db)
    log = AuditLog(
        id=None,
        user_id=body.user_id,
        agency_id=body.agency_id,
        category=body.category,
        action=body.action,
        entity_name=body.entity_name,
        entity_id=body.entity_id,
        old_data=body.old_data,
        new_data=body.new_data,
        ip_address=body.ip_address,
        created_at=datetime.utcnow(),
    )
    created = await repo.create(log)
    return AuditLogOut(
        id=created.id,
        user_id=created.user_id,
        agency_id=created.agency_id,
        category=created.category,
        action=created.action,
        entity_name=created.entity_name,
        entity_id=created.entity_id,
        old_data=created.old_data,
        new_data=created.new_data,
        ip_address=created.ip_address,
        created_at=created.created_at.isoformat() if created.created_at else None,
    )
