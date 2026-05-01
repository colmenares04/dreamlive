import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.adapters.db.base import Base
from app.core.entities.user import UserRole, UserStatus

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
