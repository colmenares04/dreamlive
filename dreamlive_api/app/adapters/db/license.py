import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.adapters.db.base import Base
from app.core.entities.license import LicenseStatus

class LicenseORM(Base):
    __tablename__ = "licenses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=False)
    recruiter_name = Column(String(200), nullable=False)
    status = Column(Enum(LicenseStatus), default=LicenseStatus.ACTIVE, nullable=False)
    request_limit = Column(Integer, default=60, nullable=False)
    refresh_minutes = Column(Integer, default=60, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    max_devices = Column(Integer, default=1, nullable=False)
    full_name = Column(String(255), nullable=True)
    keywords = Column(Text, default="batallas/versus/duelo/pk", nullable=True)
    message_templates = Column(JSON, default=list, nullable=True)
    admin_password = Column(String(255), default="admin123", nullable=True)
    invitation_types = Column(JSON, default=list, nullable=True)
    theme = Column(String(50), default="dark", nullable=True)
    daily_contact_count = Column(Integer, default=0, nullable=False)
    last_contact_date = Column(DateTime(timezone=True), nullable=True)
    role = Column(String(50), default="agent", nullable=True)

    # Relaciones
    agency = relationship("AgencyORM", back_populates="licenses")
    leads = relationship("LeadORM", back_populates="license", lazy="select")


class LicenseSessionORM(Base):
    __tablename__ = "license_sessions"

    id = Column(String(100), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    license_id = Column(String(36), ForeignKey("licenses.id"), nullable=False)
    device_id = Column(String(100), nullable=False)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    last_ping = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
