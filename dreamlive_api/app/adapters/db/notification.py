import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, ARRAY
from sqlalchemy.sql import func

from app.adapters.db.base import Base


class NotificationORM(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)  # superuser who created it
    title = Column(String(200), nullable=False)
    description_ext = Column(Text, default="")
    description_web = Column(Text, default="")
    images = Column(ARRAY(String), default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NotificationReadORM(Base):
    __tablename__ = "notification_reads"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    notification_id = Column(String(36), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), server_default=func.now())
