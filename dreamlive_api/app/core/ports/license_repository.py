"""
Puerto (interfaz) del repositorio de Licencias.

Pertenece a la capa Core. Solo define el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional

from app.core.entities.license import License


class ILicenseRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de licencias."""

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
    async def delete(self, license_id: str) -> None: ...

    @abstractmethod
    async def update_date(self, license_id: str, new_date: datetime) -> None: ...

    @abstractmethod
    async def bulk_update_password(self, agency_id: str, new_password: str) -> int: ...

    @abstractmethod
    async def count_active_sessions(self, agency_id: Optional[str] = None) -> int: ...

    @abstractmethod
    async def get_last_pings(self, license_ids: List[str]) -> Dict[str, str]: ...
