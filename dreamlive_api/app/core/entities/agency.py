"""
Entidad de dominio: Agency (Agencia).

Pertenece a la capa Core. Cero dependencias externas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class Agency:
    """Organización principal que consolida agentes y licencias."""

    id: Optional[str] = None
    name: str = ""
    logo_url: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role_permissions: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
