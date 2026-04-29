"""
Puertos (interfaces) del dominio adaptados para Supabase (IDs por defecto string/UUID).
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

from app.core.entities.user import User, UserRole
from app.core.entities.models import (
    Agency, License, LicenseStatus, Lead, LeadStatus, AppVersion,
    Ticket, TicketMessage, AuditLog
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

    @abstractmethod
    async def delete(self, agency_id: str) -> None: ...


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

    @abstractmethod
    async def count_active_sessions(self, agency_id: Optional[str] = None) -> int: ...

    @abstractmethod
    async def upsert_session(
        self,
        license_id: str,
        device_id: str,
        browser_name: Optional[str] = None,
        os_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> bool: ...


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD PORT
# ═══════════════════════════════════════════════════════════════════════════════
class ILeadRepository(ABC):
    @abstractmethod
    async def get_by_id(self, lead_id: str) -> Optional[Lead]: ...

    @abstractmethod
    async def create(self, lead: Lead) -> Lead: ...

    @abstractmethod
    async def get_by_username(self, license_id: str, username: str) -> Optional[Lead]: ...

    @abstractmethod
    async def update(self, lead: Lead) -> Lead: ...

    @abstractmethod
    async def list_paginated(
        self,
        license_ids: List[str],
        page: int = 1,
        page_size: int = 50,
        status: Optional[LeadStatus] = None,
    ) -> Tuple[List[Lead], int]: ...

    @abstractmethod
    async def count_by_status(self, license_id: str) -> dict: ...

    @abstractmethod
    async def count_by_status_bulk(self, license_ids: List[str]) -> dict:
        """Returns {status: count} aggregated across ALL given license_ids in ONE query."""
        ...

    @abstractmethod
    async def get_daily_stats_bulk(self, license_ids: List[str], days: int) -> List[dict]:
        """Returns list of {date, count} for the last X days."""
        ...

    @abstractmethod
    async def count_by_status_grouped_by_license(self, license_ids: List[str]) -> Dict[str, Dict[str, int]]:
        """Returns {license_id: {status: count}}."""
        ...

    @abstractmethod
    async def count_under_date(self, license_ids: List[str], start_date: datetime) -> Dict[str, int]:
        """Returns {status: count} for leads captured >= start_date across all given licenses."""
        ...


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

    @abstractmethod
    async def get_avg_resolution_time(self) -> float:
        """Returns average resolution time in minutes."""
        ...


class ITicketMessageRepository(ABC):
    @abstractmethod
    async def list_by_ticket(self, ticket_id: str) -> List[TicketMessage]: ...

    @abstractmethod
    async def create(self, message: TicketMessage) -> TicketMessage: ...


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG PORT
# ═══════════════════════════════════════════════════════════════════════════════
class IAuditLogRepository(ABC):
    @abstractmethod
    async def list_all(self, agency_id: Optional[str] = None) -> List[AuditLog]: ...

    @abstractmethod
    async def create(self, log: AuditLog) -> AuditLog: ...

    @abstractmethod
    async def get_recent_activity(self, limit: int = 10, agency_id: Optional[str] = None) -> List[AuditLog]: ...


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
