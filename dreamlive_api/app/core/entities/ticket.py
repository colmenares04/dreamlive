"""
Entidades de dominio: Ticket y TicketMessage.

Pertenecen a la capa Core. Cero dependencias externas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Ticket:
    """Ticket de soporte levantado por o para una agencia."""

    id: Optional[str] = None
    agency_id: str = ""
    assigned_to_user_id: Optional[str] = None
    subject: str = ""
    description: str = ""
    status: str = TicketStatus.OPEN
    priority: str = TicketPriority.MEDIUM
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None


@dataclass
class TicketMessage:
    """Mensaje individual dentro del hilo de conversación de un ticket."""

    id: Optional[str] = None
    ticket_id: str = ""
    user_id: str = ""
    message: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
