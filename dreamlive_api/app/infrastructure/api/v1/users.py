"""
Rutas de usuarios, tickets y auditoría — Controladores "tontos".
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, EmailStr

from app.application.auth.use_cases import CreateUserInput, CreateUserUseCase
from app.application.users.use_cases import (
    ListUsersUseCase, UpdateUserUseCase, DeleteUserUseCase, InviteUserUseCase,
    ListTicketsUseCase, CreateTicketUseCase, UpdateTicketStatusUseCase, DeleteTicketUseCase,
    ListAuditLogsUseCase, CreateAuditLogUseCase,
)
from app.core.entities.user import User, UserRole, UserStatus
from app.infrastructure.api.deps import (
    get_current_user,
    require_admin,
    require_agency_group,
    require_owner_or_admin,
)
from app.infrastructure.api.providers import (
    get_create_user_use_case,
    get_list_users_use_case,
    get_update_user_use_case,
    get_delete_user_use_case,
    get_invite_user_use_case,
    get_list_tickets_use_case,
    get_create_ticket_use_case,
    get_update_ticket_status_use_case,
    get_delete_ticket_use_case,
    get_list_audit_logs_use_case,
    get_create_audit_log_use_case,
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
    full_name: Optional[str] = None
    agency_id: Optional[str] = None


class UpdateUserBody(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None
    agency_id: Optional[str] = None


class InviteUserBody(BaseModel):
    email: EmailStr
    role: UserRole


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
    status: str


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


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
users_router = APIRouter(prefix="/users", tags=["Users"])
tickets_router = APIRouter(prefix="/tickets", tags=["Tickets"])
audit_router = APIRouter(prefix="/audit", tags=["AuditLogs"])


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────
@users_router.get("/", response_model=List[UserOut], dependencies=[Depends(require_agency_group)])
async def list_users(
    agency_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    use_case: ListUsersUseCase = Depends(get_list_users_use_case)
):
    users = await use_case.execute(
        current_user_role=current_user.role,
        current_user_agency_id=str(current_user.agency_id) if current_user.agency_id else None,
        agency_id=agency_id
    )
    return [
        UserOut(
            id=user.id, email=user.email, username=user.username,
            full_name=user.username, role=user.role.value,
            status=user.status.value, agency_id=user.agency_id,
        ) for user in users
    ]


@users_router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserOut, dependencies=[Depends(require_owner_or_admin)])
async def create_user(
    body: CreateUserBody, 
    current_user: User = Depends(get_current_user), 
    use_case: CreateUserUseCase = Depends(get_create_user_use_case),
):
    effective_agency_id = body.agency_id or (str(current_user.agency_id) if current_user.agency_id else None)
    
    result = await use_case.execute(
        CreateUserInput(
            email=body.email, username=body.username, password=body.password,
            role=body.role, full_name=body.full_name, agency_id=effective_agency_id,
        )
    )
    user = result.user
    return UserOut(
        id=user.id, email=user.email, username=user.username,
        full_name=user.username, role=user.role.value,
        status=user.status.value, agency_id=user.agency_id,
    )


@users_router.patch("/{user_id}", response_model=UserOut, dependencies=[Depends(require_owner_or_admin)])
async def update_user(
    user_id: str, 
    body: UpdateUserBody, 
    current_user: User = Depends(get_current_user),
    use_case: UpdateUserUseCase = Depends(get_update_user_use_case),
):
    user = await use_case.execute(
        user_id=user_id, current_user=current_user,
        username=body.username, role=body.role, status=body.status,
        password=body.password, agency_id=body.agency_id
    )
    return UserOut(
        id=user.id, email=user.email, username=user.username,
        full_name=user.username, role=user.role.value,
        status=user.status.value, agency_id=user.agency_id,
    )


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_owner_or_admin)])
async def delete_user(
    user_id: str, 
    current_user: User = Depends(get_current_user),
    use_case: DeleteUserUseCase = Depends(get_delete_user_use_case),
):
    await use_case.execute(user_id=user_id, current_user=current_user)
    return None


@users_router.post("/invite", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_owner_or_admin)])
async def invite_user(
    body: InviteUserBody,
    current_user: User = Depends(get_current_user),
    use_case: InviteUserUseCase = Depends(get_invite_user_use_case),
):
    user = await use_case.execute(
        email=body.email,
        role=body.role.value,
        agency_id=str(current_user.agency_id) if current_user.agency_id else None
    )
    return UserOut(
        id=user.id, email=user.email, username=user.username,
        full_name=user.username, role=user.role.value,
        status=user.status.value, agency_id=user.agency_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Tickets
# ─────────────────────────────────────────────────────────────────────────────
@tickets_router.get("/", response_model=List[TicketOut], dependencies=[Depends(require_agency_group)])
async def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to: Optional[str] = Query(None, alias="assigned_to"),
    current_user: User = Depends(get_current_user),
    use_case: ListTicketsUseCase = Depends(get_list_tickets_use_case),
):
    tickets = await use_case.execute(
        current_user_role=current_user.role,
        current_user_agency_id=str(current_user.agency_id) if current_user.agency_id else None,
        status_filter=status_filter, assigned_to=assigned_to
    )
    return [
        TicketOut(
            id=t.id, agency_id=t.agency_id, assigned_to_user_id=t.assigned_to_user_id,
            subject=t.subject, description=t.description, status=t.status, priority=t.priority,
            created_at=t.created_at.isoformat() if t.created_at else None,
            updated_at=t.updated_at.isoformat() if t.updated_at else None,
            closed_at=t.closed_at.isoformat() if t.closed_at else None,
        ) for t in tickets
    ]


@tickets_router.post("/", status_code=status.HTTP_201_CREATED, response_model=TicketOut, dependencies=[Depends(require_agency_group)])
async def create_ticket(
    body: CreateTicketBody, 
    current_user: User = Depends(get_current_user), 
    use_case: CreateTicketUseCase = Depends(get_create_ticket_use_case)
):
    ticket = await use_case.execute(
        subject=body.subject, description=body.description, priority=body.priority,
        current_user=current_user, agency_id=body.agency_id, assigned_to=body.assigned_to_user_id
    )
    return TicketOut(
        id=ticket.id, agency_id=ticket.agency_id, assigned_to_user_id=ticket.assigned_to_user_id,
        subject=ticket.subject, description=ticket.description, status=ticket.status, priority=ticket.priority,
        created_at=ticket.created_at.isoformat() if ticket.created_at else None,
        updated_at=ticket.updated_at.isoformat() if ticket.updated_at else None,
        closed_at=ticket.closed_at.isoformat() if ticket.closed_at else None,
    )


@tickets_router.patch("/{ticket_id}/status", response_model=TicketOut, dependencies=[Depends(require_agency_group)])
async def update_ticket_status(
    ticket_id: str, 
    body: UpdateTicketBody, 
    current_user: User = Depends(get_current_user), 
    use_case: UpdateTicketStatusUseCase = Depends(get_update_ticket_status_use_case)
):
    ticket = await use_case.execute(ticket_id=ticket_id, new_status=body.status, current_user=current_user)
    return TicketOut(
        id=ticket.id, agency_id=ticket.agency_id, assigned_to_user_id=ticket.assigned_to_user_id,
        subject=ticket.subject, description=ticket.description, status=ticket.status, priority=ticket.priority,
        created_at=ticket.created_at.isoformat() if ticket.created_at else None,
        updated_at=ticket.updated_at.isoformat() if ticket.updated_at else None,
        closed_at=ticket.closed_at.isoformat() if ticket.closed_at else None,
    )


@tickets_router.delete("/{ticket_id}", dependencies=[Depends(require_admin)])
async def delete_ticket(
    ticket_id: str, 
    use_case: DeleteTicketUseCase = Depends(get_delete_ticket_use_case)
):
    await use_case.execute(ticket_id=ticket_id)
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Audit logs
# ─────────────────────────────────────────────────────────────────────────────
@audit_router.get("/", response_model=List[AuditLogOut], dependencies=[Depends(require_admin)])
async def list_audit_logs(
    agency_id: Optional[str] = None, 
    use_case: ListAuditLogsUseCase = Depends(get_list_audit_logs_use_case)
):
    logs = await use_case.execute(agency_id=agency_id)
    return [
        AuditLogOut(
            id=log.id, user_id=log.user_id, agency_id=log.agency_id,
            category=log.category, action=log.action, entity_name=log.entity_name,
            entity_id=log.entity_id, old_data=log.old_data, new_data=log.new_data,
            ip_address=log.ip_address, created_at=log.created_at.isoformat() if log.created_at else None,
        ) for log in logs
    ]
