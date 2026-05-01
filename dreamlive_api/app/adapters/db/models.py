"""
Modelos ORM de SQLAlchemy (capa de adaptador, NO dominio).
Generan automáticamente las tablas en PostgreSQL vía Alembic.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text, ARRAY, BigInteger, JSON
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func

from app.core.entities.license import LicenseStatus
from app.core.entities.lead import LeadStatus
from app.core.entities.app_version import Platform
from app.core.entities.user import UserRole, UserStatus
from app.core.entities.ticket import TicketStatus, TicketPriority


class Base(DeclarativeBase):
    """Base declarativa compartida por todos los modelos."""
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCY
# ═══════════════════════════════════════════════════════════════════════════════
class AgencyORM(Base):
    __tablename__ = "agencies"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    code = Column(String(20), default="", nullable=True, index=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Campos adicionales de dominio
    logo_url = Column(String(500), nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password = Column(String(255), nullable=True)
    role_permissions = Column(JSON, default=dict, nullable=True)

    # Relaciones
    licenses = relationship("LicenseORM", back_populates="agency", lazy="select")
    users = relationship(
        "UserORM",
        back_populates="agency",
        foreign_keys="UserORM.agency_id",
        lazy="select",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# USER
# ═══════════════════════════════════════════════════════════════════════════════
class UserORM(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(200), default="")
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    totp_secret = Column(String(64), nullable=True)

    # Reset de contraseña
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relaciones
    agency = relationship(
        "AgencyORM",
        back_populates="users",
        foreign_keys=[agency_id],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# LICENSE
# ═══════════════════════════════════════════════════════════════════════════════
class LicenseORM(Base):
    __tablename__ = "licenses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=False)
    recruiter_name = Column(String(200), nullable=False)
    status = Column(Enum(LicenseStatus), default=LicenseStatus.ACTIVE, nullable=False)
    request_limit = Column(Integer, default=60, nullable=False)
    refresh_minutes = Column(Integer, default=1, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Campos adicionales de dominio
    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    max_devices = Column(Integer, default=1, nullable=False)
    full_name = Column(String(255), nullable=True)
    keywords = Column(Text, default="batallas/versus/duelo/pk", nullable=True)
    message_templates = Column(JSON, default=list, nullable=True)
    admin_password = Column(String(255), default="admin123", nullable=True)
    invitation_types = Column(JSON, default=list, nullable=True)
    theme = Column(String(50), default="dark", nullable=True)

    # Relaciones
    agency = relationship("AgencyORM", back_populates="licenses")
    leads = relationship("LeadORM", back_populates="license", lazy="select")


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD
# ═══════════════════════════════════════════════════════════════════════════════
class LeadORM(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(200), nullable=False, index=True)
    license_id = Column(String(36), ForeignKey("licenses.id"), nullable=False)
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=False)
    status = Column(Enum(LeadStatus), default=LeadStatus.AVAILABLE, nullable=False, index=True)
    followers = Column(BigInteger, default=0)
    following = Column(BigInteger, default=0)
    keywords = Column(ARRAY(String), default=list)
    profile_url = Column(String(500), nullable=True)
    contacted_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Campos de dominio de leads (TikTok)
    viewer_count = Column(Integer, default=0, nullable=False)
    source = Column(String(100), default="unknown", nullable=False)
    likes_count = Column(Integer, default=0, nullable=False)
    captured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    license = relationship("LicenseORM", back_populates="leads")


# ═══════════════════════════════════════════════════════════════════════════════
# APP VERSION
# ═══════════════════════════════════════════════════════════════════════════════
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


# ═══════════════════════════════════════════════════════════════════════════════
# TICKETS
# ═══════════════════════════════════════════════════════════════════════════════
class TicketORM(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=False)
    assigned_to_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
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
    ticket_id = Column(String(36), ForeignKey("tickets.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════════════
class AuditLogORM(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=True)
    category = Column(String(100), nullable=False)
    action = Column(String(255), nullable=False)
    entity_name = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LicenseSessionORM(Base):
    __tablename__ = "license_sessions"

    id = Column(String(100), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    license_id = Column(String(36), ForeignKey("licenses.id"), nullable=False)
    device_id = Column(String(100), nullable=False)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    last_ping = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
