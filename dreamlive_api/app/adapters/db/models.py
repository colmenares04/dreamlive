"""
Modelos ORM de SQLAlchemy (capa de adaptador, NO dominio).
Generan automáticamente las tablas en PostgreSQL vía Alembic.
"""
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text, ARRAY, BigInteger
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func

from app.core.entities.user import UserRole, UserStatus
from app.core.entities.models import LicenseStatus, LeadStatus, Platform, VersionTag


class Base(DeclarativeBase):
    """Base declarativa compartida por todos los modelos."""
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCY
# ═══════════════════════════════════════════════════════════════════════════════
class AgencyORM(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(200), default="")
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True)
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

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    recruiter_name = Column(String(200), nullable=False)
    status = Column(Enum(LicenseStatus), default=LicenseStatus.ACTIVE, nullable=False)
    request_limit = Column(Integer, default=60, nullable=False)
    refresh_minutes = Column(Integer, default=1, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    agency = relationship("AgencyORM", back_populates="licenses")
    leads = relationship("LeadORM", back_populates="license", lazy="select")


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD
# ═══════════════════════════════════════════════════════════════════════════════
class LeadORM(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(200), nullable=False, index=True)
    license_id = Column(Integer, ForeignKey("licenses.id"), nullable=False)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    status = Column(Enum(LeadStatus), default=LeadStatus.AVAILABLE, nullable=False, index=True)
    followers = Column(BigInteger, default=0)
    following = Column(BigInteger, default=0)
    keywords = Column(ARRAY(String), default=list)
    profile_url = Column(String(500), nullable=True)
    contacted_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relaciones
    license = relationship("LicenseORM", back_populates="leads")


# ═══════════════════════════════════════════════════════════════════════════════
# APP VERSION
# ═══════════════════════════════════════════════════════════════════════════════
class AppVersionORM(Base):
    __tablename__ = "app_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_number = Column(String(30), nullable=False)
    platform = Column(Enum(Platform), nullable=False)
    file_url = Column(Text, nullable=False)
    file_size_kb = Column(Integer, default=0)
    changelog = Column(Text, default="")
    tags = Column(ARRAY(String), default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    release_date = Column(DateTime(timezone=True), server_default=func.now())
