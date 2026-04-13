"""
Puertos (interfaces) del dominio adaptados para Supabase (IDs por defecto string/UUID).
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

from app.core.entities.user import User, UserRole
from app.core.entities.models import (
    Agency, License, LicenseStatus, Lead, LeadStatus, AppVersion,
    Ticket, AuditLog
)


# ═══════════════════════════════════════════════════════════════════════════════
# USER PORT
# ═══════════════════════════════════════════════════════════════════════════════
class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]: ...

    @abstractmethod
    async def create(self, user: User) -> User: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...

    @abstractmethod
    async def list_all(self, agency_id: Optional[str] = None) -> List[User]: ...

    @abstractmethod
    async def delete(self, user_id: str) -> None: ...


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCY PORT (Reemplaza a parte de la lógica central)
# ═══════════════════════════════════════════════════════════════════════════════
class IAgencyRepository(ABC):
    @abstractmethod
    async def get_by_id(self, agency_id: str) -> Optional[Agency]: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[Agency]: ...

    @abstractmethod
    async def create(self, agency: Agency) -> Agency: ...

    @abstractmethod
    async def update(self, agency: Agency) -> Agency: ...

    @abstractmethod
    async def list_all(self) -> List[Agency]: ...


# ═══════════════════════════════════════════════════════════════════════════════
# LICENSE PORT
# ═══════════════════════════════════════════════════════════════════════════════
class ILicenseRepository(ABC):
    @abstractmethod
    async def get_by_id(self, license_id: str) -> Optional[License]: ...

    @abstractmethod
    async def get_by_key(self, key: str) -> Optional[License]: ...

    @abstractmethod
    async def create(self, license_: License) -> License: ...

    @abstractmethod
    async def update(self, license_: License) -> License: ...

    @abstractmethod
    async def list_all(
        self,
        is_active: Optional[bool] = None,
        agency_id: Optional[str] = None,
    ) -> List[License]: ...


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD PORT
# ═══════════════════════════════════════════════════════════════════════════════
class ILeadRepository(ABC):
    @abstractmethod
    async def get_by_id(self, lead_id: str) -> Optional[Lead]: ...

    @abstractmethod
    async def create(self, lead: Lead) -> Lead: ...

    @abstractmethod
    async def update(self, lead: Lead) -> Lead: ...

    @abstractmethod
    async def list_paginated(
        self,
        license_id: str,
        page: int = 1,
        page_size: int = 50,
        status: Optional[LeadStatus] = None,
    ) -> Tuple[List[Lead], int]: ...

    @abstractmethod
    async def count_by_status(self, license_id: str) -> dict: ...


# ═══════════════════════════════════════════════════════════════════════════════
# TICKET PORT
# ═══════════════════════════════════════════════════════════════════════════════
class ITicketRepository(ABC):
    @abstractmethod
    async def get_by_id(self, ticket_id: str) -> Optional[Ticket]: ...

    @abstractmethod
    async def list_all(self, agency_id: Optional[str] = None) -> List[Ticket]: ...

    @abstractmethod
    async def create(self, ticket: Ticket) -> Ticket: ...

    @abstractmethod
    async def update(self, ticket: Ticket) -> Ticket: ...


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG PORT
# ═══════════════════════════════════════════════════════════════════════════════
class IAuditLogRepository(ABC):
    @abstractmethod
    async def list_all(self, agency_id: Optional[str] = None) -> List[AuditLog]: ...

    @abstractmethod
    async def create(self, log: AuditLog) -> AuditLog: ...


# ═══════════════════════════════════════════════════════════════════════════════
# APP VERSION PORT
# ═══════════════════════════════════════════════════════════════════════════════
class IAppVersionRepository(ABC):
    @abstractmethod
    async def get_by_id(self, version_id: str) -> Optional[AppVersion]: ...

    @abstractmethod
    async def get_latest_active(self, platform: str) -> Optional[AppVersion]: ...

    @abstractmethod
    async def create(self, version: AppVersion) -> AppVersion: ...

    @abstractmethod
    async def delete(self, version_id: str) -> None: ...

    @abstractmethod
    async def list_all(self) -> List[AppVersion]: ...
