"""
Entidad de dominio: Lead (Prospecto TikTok).

Pertenece a la capa Core. Cero dependencias externas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class LeadStatus(str, Enum):
    AVAILABLE = "disponible"
    CONTACTED = "contactado"
    COLLECTED = "recopilado"


@dataclass
class Lead:
    """Prospecto capturado en TikTok durante un live."""

    id: Optional[str] = None
    license_id: str = ""
    username: str = ""
    status: LeadStatus = LeadStatus.COLLECTED
    captured_at: datetime = field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    contacted_at: Optional[datetime] = None
    viewer_count: int = 0
    source: str = "unknown"
    likes_count: int = 0
