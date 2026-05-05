import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.sql import func

from app.adapters.db.base import Base
from app.core.entities.ticket import TicketStatus, TicketPriority

class TicketORM(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    agency_id = Column(String(36), ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False)
    assigned_to_user_id = Column(String(36), nullable=True)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)


class TicketMessageORM(Base):
    __tablename__ = "ticket_messages"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
