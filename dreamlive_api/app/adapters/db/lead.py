import uuid
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Integer, String, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.adapters.db.base import Base
from app.core.entities.lead import LeadStatus

class LeadORM(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(200), nullable=False, index=True)
    license_id = Column(String(36), ForeignKey("licenses.id"), nullable=False)
    agency_id = Column(String(36), ForeignKey("agencies.id"), nullable=False)
    status = Column(Enum(LeadStatus, name="leadstatus"), default=LeadStatus.AVAILABLE, nullable=False, index=True)
    followers = Column(BigInteger, default=0)
    following = Column(BigInteger, default=0)
    keywords = Column(ARRAY(String), default=list)
    profile_url = Column(String(500), nullable=True)
    contacted_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    viewer_count = Column(Integer, default=0, nullable=False)
    source = Column(String(100), default="unknown", nullable=False)
    likes_count = Column(Integer, default=0, nullable=False)
    captured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    license = relationship("LicenseORM", back_populates="leads")
