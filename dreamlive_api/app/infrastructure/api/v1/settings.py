"""
Rutas de Tickets y Auditoría.
  /api/v1/tickets  → Agencia / Admin
  /api/v1/audit    → Solo Admin
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from datetime import datetime, timezone

from app.adapters.db.session import get_db
from app.core.entities.user import User
from app.infrastructure.api.deps import get_current_user, require_admin

# ───────────────────────────────────────── TICKETS ──────────────────────────────

tickets_router = APIRouter(prefix="/tickets", tags=["Tickets"])


class TicketCreate(BaseModel):
    subject: str
    description: str
    priority: str = "medium"  # low | medium | high | critical


class TicketReply(BaseModel):
    message: str


@tickets_router.get("/")
async def list_tickets(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Admins see all; agency users see only their own."""
    query = db.table("dreamtool.tickets").select("*").order("created_at", desc=True)
    if current_user.role.value != "superuser":
        query = query.eq("agency_id", str(current_user.agency_id))
    result = query.execute()
    return result.data or []


@tickets_router.post("/", status_code=201)
async def create_ticket(
    body: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    row = {
        "agency_id": str(current_user.agency_id) if current_user.agency_id else None,
        "subject": body.subject,
        "description": body.description,
        "priority": body.priority,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("dreamtool.tickets").insert(row).execute()
    if not result.data:
        raise HTTPException(500, "Error al crear ticket")
    return result.data[0]


@tickets_router.patch("/{ticket_id}/status", dependencies=[Depends(require_admin)])
async def update_ticket_status(
    ticket_id: str,
    status: str,
    db: Client = Depends(get_db),
):
    allowed = {"open", "in_progress", "resolved", "closed"}
    if status not in allowed:
        raise HTTPException(400, f"Estado inválido. Permitidos: {allowed}")
    result = db.table("dreamtool.tickets").update({
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", ticket_id).execute()
    if not result.data:
        raise HTTPException(404, "Ticket no encontrado")
    return result.data[0]


@tickets_router.delete("/{ticket_id}", dependencies=[Depends(require_admin)])
async def delete_ticket(ticket_id: str, db: Client = Depends(get_db)):
    db.table("dreamtool.tickets").delete().eq("id", ticket_id).execute()
    return {"ok": True}


# ───────────────────────────────────────── AUDIT ─────────────────────────────────

audit_router = APIRouter(prefix="/audit", tags=["Audit"])


@audit_router.get("/", dependencies=[Depends(require_admin)])
async def list_audit(
    category: Optional[str] = None,
    agency_id: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    db: Client = Depends(get_db),
):
    query = (
        db.table("dreamtool.audit_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if category:
        query = query.eq("category", category)
    if agency_id:
        query = query.eq("agency_id", agency_id)
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.execute()
    return result.data or []


# ───────────────────────────────────────── USERS (profiles) ──────────────────────

users_profiles_router = APIRouter(prefix="/users", tags=["Users"])


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None


@users_profiles_router.get("/")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Superuser sees all; agency sees own agency users."""
    query = db.table("dreamtool.users").select("id,email,username,full_name,role,status,agency_id,created_at")
    if current_user.role.value != "superuser":
        query = query.eq("agency_id", str(current_user.agency_id))
    result = query.order("created_at", desc=True).execute()
    return result.data or []


@users_profiles_router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    # Only superuser can assign roles; agency_admin can edit name/username
    updates: dict = {}
    if body.username:
        updates["username"] = body.username
    if body.full_name:
        updates["full_name"] = body.full_name
    if body.role:
        if current_user.role.value != "superuser":
            raise HTTPException(403, "Solo superuser puede cambiar roles")
        allowed_roles = {"agency_admin", "agent", "visitor"}
        if body.role not in allowed_roles:
            raise HTTPException(400, f"Rol inválido. Permitidos: {allowed_roles}")
        updates["role"] = body.role
    if not updates:
        raise HTTPException(400, "Nada que actualizar")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = db.table("dreamtool.users").update(updates).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "Usuario no encontrado")
    return result.data[0]


@users_profiles_router.post("/invite", status_code=201)
async def invite_user(
    email: str,
    role: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Create a pending user record (invite flow)."""
    allowed = {"agency_admin", "agent", "visitor"}
    if role not in allowed:
        raise HTTPException(400, f"Rol inválido. Permitidos: {allowed}")
    row = {
        "email": email,
        "username": email.split("@")[0],
        "full_name": "",
        "role": role,
        "status": "pending",
        "agency_id": str(current_user.agency_id) if current_user.agency_id else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("dreamtool.users").insert(row).execute()
    if not result.data:
        raise HTTPException(500, "Error al invitar usuario")
    return result.data[0]
