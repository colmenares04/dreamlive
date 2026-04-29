"""
Entidades de dominio: AuditLog.

Pertenece a la capa Core. Cero dependencias externas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class AuditLog:
    """Registro de auditoría para rastrear acciones críticas en el sistema."""

    id: Optional[str] = None
    user_id: Optional[str] = None
    agency_id: Optional[str] = None
    category: str = ""
    action: str = ""
    entity_name: Optional[str] = None
    entity_id: Optional[str] = None
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
