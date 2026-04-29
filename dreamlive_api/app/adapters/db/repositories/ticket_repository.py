"""
Repositorios concretos de Ticket y TicketMessage (Supabase).
"""
import asyncio
from datetime import datetime
from typing import List, Optional

from supabase import Client

from app.core.entities.ticket import Ticket, TicketMessage
from app.core.ports.ticket_repository import ITicketRepository, ITicketMessageRepository


class TicketRepository(ITicketRepository):
    """Implementación Supabase del repositorio de tickets."""

    def __init__(self, db: Client) -> None:
        self._db = db

    def _parse_dt(self, value: Optional[str]) -> datetime:
        if not value:
            return datetime.utcnow()
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def _to_domain(self, row: dict) -> Ticket:
        return Ticket(
            id=row.get("id"),
            agency_id=row.get("agency_id", ""),
            assigned_to_user_id=row.get("assigned_to_user_id"),
            subject=row.get("subject", ""),
            description=row.get("description", ""),
            status=row.get("status", "open"),
            priority=row.get("priority", "medium"),
            created_at=self._parse_dt(row.get("created_at")),
            updated_at=self._parse_dt(row.get("updated_at")),
            closed_at=self._parse_dt(row["closed_at"]) if row.get("closed_at") else None,
        )

    async def get_by_id(self, ticket_id: str) -> Optional[Ticket]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("tickets").select("*").eq("id", ticket_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def list_all(self, agency_id: Optional[str] = None) -> List[Ticket]:
        def _query():
            q = self._db.table("tickets").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.execute()

        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]

    async def create(self, ticket: Ticket) -> Ticket:
        data = {
            "agency_id": ticket.agency_id,
            "assigned_to_user_id": ticket.assigned_to_user_id,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("tickets").insert(data).execute()
        )
        if not resp.data:
            raise RuntimeError("Fallo al crear el ticket en la base de datos.")
        return self._to_domain(resp.data[0])

    async def update(self, ticket: Ticket) -> Ticket:
        data = {
            "assigned_to_user_id": ticket.assigned_to_user_id,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "closed_at": ticket.closed_at.isoformat() if ticket.closed_at else None,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("tickets").update(data).eq("id", ticket.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def delete(self, ticket_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("tickets").delete().eq("id", ticket_id).execute()
        )

    async def get_avg_resolution_time(self) -> float:
        def _query():
            return (
                self._db.table("tickets")
                .select("created_at, closed_at")
                .not_.is_("closed_at", "null")
                .execute()
            )

        resp = await asyncio.to_thread(_query)
        if not resp.data:
            return 0.0

        total_mins = sum(
            (
                datetime.fromisoformat(r["closed_at"].replace("Z", "+00:00"))
                - datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
            ).total_seconds()
            / 60
            for r in resp.data
        )
        return total_mins / len(resp.data)


class TicketMessageRepository(ITicketMessageRepository):
    """Implementación Supabase del repositorio de mensajes de tickets."""

    def __init__(self, db: Client) -> None:
        self._db = db

    def _to_domain(self, row: dict) -> TicketMessage:
        created_str = row.get("created_at")
        return TicketMessage(
            id=row.get("id"),
            ticket_id=row.get("ticket_id", ""),
            user_id=row.get("user_id", ""),
            message=row.get("message", ""),
            created_at=(
                datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                if created_str
                else datetime.utcnow()
            ),
        )

    async def list_by_ticket(self, ticket_id: str) -> List[TicketMessage]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("ticket_messages")
            .select("*")
            .eq("ticket_id", ticket_id)
            .order("created_at", desc=False)
            .execute()
        )
        return [self._to_domain(r) for r in resp.data] if resp.data else []

    async def create(self, message: TicketMessage) -> TicketMessage:
        data = {
            "ticket_id": message.ticket_id,
            "user_id": message.user_id,
            "message": message.message,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("ticket_messages").insert(data).execute()
        )
        if not resp.data:
            raise RuntimeError("Fallo al guardar el mensaje del ticket.")
        return self._to_domain(resp.data[0])
