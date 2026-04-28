"""
Entidades de dominio para Supabase: Licencia, Agencia, Lead (TikTok), Versión de App.
"""
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════
class LicenseStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"

class Platform(str, Enum):
    WINDOWS = "windows"
    MACOS = "macos"

class VersionTag(str, Enum):
    NEW = "new"
    FIX = "fix"
    FEAT = "feat"
    PERF = "perf"
    SEC = "sec"

# ═══════════════════════════════════════════════════════════════════════════════
# AGENCIA
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class Agency:
    """Organización principal que consolida a los agentes (agencias o equipos)."""
    id: Optional[str] = None
    name: str = ""
    logo_url: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role_permissions: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# LICENCIA
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class License:
    """
    Licencia de acceso asignada a una agencia.
    Controla límites de requests y configuración como mensaje_templates.
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
    
    # Custom fields by Supabase schema
    keywords: str = "batallas/versus/duelo/pk"
    message_templates: List[str] = field(default_factory=list)
    recruiter_name: str = "Agente DreamLive"
    limit_requests: int = 60
    refresh_minutes: int = 720
    admin_password: str = "admin123"
    invitation_types: List[str] = field(default_factory=list)
    theme: str = "dark"

    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.expiration_date and datetime.utcnow() > self.expiration_date.replace(tzinfo=None):
            return False
        return True


# ═══════════════════════════════════════════════════════════════════════════════
# SESIONES DE LICENCIA (Dispositivos)
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class LicenseSession:
    id: Optional[str] = None
    license_id: str = ""
    device_id: str = ""
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    last_ping: datetime = field(default_factory=datetime.utcnow)
    created_at: datetime = field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# TICKET
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class Ticket:
    id: Optional[str] = None
    agency_id: str = ""
    assigned_to_user_id: Optional[str] = None
    subject: str = ""
    description: str = ""
    status: str = "open"
    priority: str = "medium"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════════════════════
# TICKET MESSAGE
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class TicketMessage:
    """Mensaje individual dentro de un hilo de conversación de un ticket."""
    id: Optional[str] = None
    ticket_id: str = ""
    user_id: str = ""
    message: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class AuditLog:
    id: Optional[str] = None
    user_id: Optional[str] = None
    agency_id: Optional[str] = None
    category: str = ""
    action: str = ""
    entity_name: Optional[str] = None
    entity_id: Optional[str] = None
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD (TikTok Lead)
# ═══════════════════════════════════════════════════════════════════════════════
class LeadStatus(str, Enum):
    AVAILABLE = "disponible"
    CONTACTED = "contactado"
    COLLECTED = "recopilado"


@dataclass
class Lead:
    """
    Prospecto capturado en TikTok.
    """
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


# ═══════════════════════════════════════════════════════════════════════════════
# VERSIÓN DE APLICACIÓN
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class AppVersion:
    """
    Versión de la extensión o aplicación.
    """
    id: Optional[str] = None
    version_number: str = ""
    changelog: str = ""
    is_active: bool = True
    file_url: str = ""
    file_size_kb: int = 0
    release_date: datetime = field(default_factory=datetime.utcnow)
    tags: List[str] = field(default_factory=list)
    platform: str = "windows"
