"""
Puerto (interfaz) del repositorio de Leads.

Pertenece a la capa Core. Solo define el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from app.core.entities.lead import Lead, LeadStatus


class ILeadRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de leads."""

    @abstractmethod
    async def get_by_id(self, lead_id: str) -> Optional[Lead]: ...

    @abstractmethod
    async def create(self, lead: Lead) -> Lead: ...

    @abstractmethod
    async def update(self, lead: Lead) -> Lead: ...

    @abstractmethod
    async def delete(self, lead_id: str) -> bool: ...

    @abstractmethod
    async def delete_by_status(self, license_ids: List[str], status: LeadStatus) -> int: ...

    @abstractmethod
    async def list_paginated(
        self,
        license_ids: List[str],
        page: int = 1,
        page_size: int = 50,
        status: Optional[LeadStatus] = None,
        search: Optional[str] = None,
        min_viewers: Optional[int] = None,
        min_likes: Optional[int] = None,
    ) -> Tuple[List[Lead], int]: ...

    @abstractmethod
    async def count_by_status(self, license_id: str) -> Dict[str, int]: ...

    @abstractmethod
    async def count_by_status_bulk(self, license_ids: List[str]) -> Dict[str, int]:
        """Retorna {status: count} agregado para todos los license_ids en una sola consulta."""
        ...

    @abstractmethod
    async def get_daily_stats_bulk(self, license_ids: List[str], days: int) -> List[Dict]:
        """Retorna lista de {date, count} para los últimos X días."""
        ...

    @abstractmethod
    async def count_by_status_grouped_by_license(
        self, license_ids: List[str]
    ) -> Dict[str, Dict[str, int]]:
        """Retorna {license_id: {status: count}}."""
        ...

    @abstractmethod
    async def count_under_date(
        self, license_ids: List[str], start_date: datetime
    ) -> Dict[str, int]:
        """Retorna {status: count} para leads capturados >= start_date."""
        ...

    @abstractmethod
    async def get_license_performance_stats(
        self, license_ids: List[str]
    ) -> Dict[str, Dict[str, int]]:
        """Retorna {license_id: {today: count, total: count}}."""
        ...
