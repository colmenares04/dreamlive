import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, JSON
from sqlalchemy.sql import func

from app.adapters.db.base import Base

class AuditLogORM(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    agency_id = Column(String(36), ForeignKey("agencies.id", ondelete="CASCADE"), nullable=True)
    category = Column(String(100), nullable=False)
    action = Column(String(255), nullable=False)
    entity_name = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
