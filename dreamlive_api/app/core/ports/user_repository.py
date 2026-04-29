"""
Puerto (interfaz) del repositorio de Usuarios.

Pertenece a la capa Core. Solo define el contrato; cero implementación.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from app.core.entities.user import User


class IUserRepository(ABC):
    """Contrato que debe cumplir cualquier adaptador de persistencia de usuarios."""

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
