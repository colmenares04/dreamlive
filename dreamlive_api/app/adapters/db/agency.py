import uuid
from sqlalchemy import Boolean, Column, DateTime, String, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.adapters.db.base import Base

class AgencyORM(Base):
    __tablename__ = "agencies"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    code = Column(String(20), default="", nullable=True, index=True)
    owner_id = Column(String(36), ForeignKey("users.id", use_alter=True, name="fk_agency_owner"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
