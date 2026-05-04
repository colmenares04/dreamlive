from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import TicketORM, TicketMessageORM

router = APIRouter(prefix="/tickets", tags=["Tickets V2"])


class TicketOut(BaseModel):
    id: str
    subject: str
    description: str
    priority: str
    status: str
    created_at: Optional[str] = None


class CreateTicketRequest(BaseModel):
    subject: str
    description: str
    priority: Optional[str] = "medium"


class UpdateTicketStatusRequest(BaseModel):
    status: str


@router.get("/", response_model=List[TicketOut])
async def list_tickets(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    stmt = select(TicketORM).where(TicketORM.agency_id == str(agency.id))
    res = await uow.session.execute(stmt)
    tickets = res.scalars().all()
    
    return [
        TicketOut(
            id=str(t.id),
            subject=t.subject,
            description=t.description,
            priority=t.priority or "medium",
            status=t.status or "open",
            created_at=t.created_at.isoformat() if t.created_at else None,
        ) for t in tickets
    ]


@router.post("/", response_model=TicketOut)
async def create_ticket(
    payload: CreateTicketRequest,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    import datetime
    ticket_id = str(uuid.uuid4())
    now_dt = datetime.datetime.utcnow()
    new_ticket = TicketORM(
        id=ticket_id,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority,
        status="open",
        agency_id=str(agency.id),
        created_at=now_dt,
    )
    uow.session.add(new_ticket)
    await uow.session.flush()
    await uow.session.commit()
    return TicketOut(
        id=ticket_id,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority or "medium",
        status="open",
        created_at=now_dt.isoformat(),
    )


@router.patch("/{ticket_id}/status", response_model=TicketOut)
async def update_ticket_status(
    ticket_id: str,
    payload: UpdateTicketStatusRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(TicketORM).where(TicketORM.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado.")
        
    ticket.status = payload.status
    await uow.session.flush()
    await uow.session.commit()
    return TicketOut(
        id=str(ticket.id),
        subject=ticket.subject,
        description=ticket.description,
        priority=ticket.priority or "medium",
        status=ticket.status,
        created_at=ticket.created_at.isoformat() if ticket.created_at else None,
    )


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, delete
    from app.adapters.db.models import TicketMessageORM

    # Delete related ticket messages first
    await uow.session.execute(delete(TicketMessageORM).where(TicketMessageORM.ticket_id == ticket_id))

    res = await uow.session.execute(select(TicketORM).where(TicketORM.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if ticket:
        await uow.session.delete(ticket)
        await uow.session.flush()
        await uow.session.commit()
    return {"status": "ok"}
