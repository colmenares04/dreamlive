"""
Puerto (interfaz) del repositorio de AppVersion.

Pertenece a la capa Core. Solo define el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from app.core.entities.app_version import AppVersion


class IAppVersionRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de versiones de la app."""

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
