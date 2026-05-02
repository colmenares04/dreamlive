"""
Entidad de dominio: License (Licencia).

Pertenece a la capa Core. Cero dependencias externas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class LicenseStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


@dataclass
class License:
    """
    Licencia de acceso asignada a una agencia.
    Controla límites de requests, configuración de mensajes y dispositivos.
    """

    id: Optional[str] = None
    agency_id: str = ""
    license_key: str = ""
    email: Optional[str] = None
    is_active: bool = True
    max_devices: int = 1
    expiration_date: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # Configuración operativa de la licencia
    full_name: Optional[str] = None
    keywords: str = "batallas/versus/duelo/pk"
    message_templates: List[str] = field(default_factory=list)
    recruiter_name: str = "Agente DreamLive"
    limit_requests: int = 60
    refresh_minutes: int = 720
    admin_password: str = "admin123"
    invitation_types: List[str] = field(default_factory=list)
    theme: str = "dark"
    daily_contact_count: int = 0
    last_contact_date: Optional[datetime] = None

    def is_valid(self) -> bool:
        """Regla de negocio: una licencia es válida si está activa y no ha expirado."""
        if not self.is_active:
            return False
        if self.expiration_date and datetime.utcnow() > self.expiration_date.replace(tzinfo=None):
            return False
        return True


@dataclass
class LicenseSession:
    """Sesión activa de un dispositivo para una licencia concreta."""

    id: Optional[str] = None
    license_id: str = ""
    device_id: str = ""
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    last_ping: datetime = field(default_factory=datetime.utcnow)
    created_at: datetime = field(default_factory=datetime.utcnow)
