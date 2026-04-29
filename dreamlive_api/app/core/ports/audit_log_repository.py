"""
Puerto (interfaz) del repositorio de AuditLog.

Pertenece a la capa Core. Solo define el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from app.core.entities.audit_log import AuditLog


class IAuditLogRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de logs de auditoría."""

    @abstractmethod
    async def list_all(self, agency_id: Optional[str] = None) -> List[AuditLog]: ...

    @abstractmethod
    async def create(self, log: AuditLog) -> AuditLog: ...

    @abstractmethod
    async def get_recent_activity(
        self, limit: int = 10, agency_id: Optional[str] = None
    ) -> List[AuditLog]: ...
