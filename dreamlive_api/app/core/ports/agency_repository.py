"""
Puerto (interfaz) del repositorio de Agencias.

Pertenece a la capa Core. Solo define el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from app.core.entities.agency import Agency


class IAgencyRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de agencias."""

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
