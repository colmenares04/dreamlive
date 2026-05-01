import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text, ARRAY
from sqlalchemy.sql import func

from app.adapters.db.base import Base
from app.core.entities.app_version import Platform

class AppVersionORM(Base):
    __tablename__ = "app_versions"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    version_number = Column(String(30), nullable=False)
    platform = Column(Enum(Platform), nullable=False)
    file_url = Column(Text, nullable=False)
    file_size_kb = Column(Integer, default=0)
    changelog = Column(Text, default="")
    tags = Column(ARRAY(String), default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    release_date = Column(DateTime(timezone=True), server_default=func.now())
