"""
Puerto para servicios de caché (Capa Core).
"""
from abc import ABC, abstractmethod
from typing import Any, Optional


class ICacheService(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Obtiene un valor de la caché."""
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Guarda un valor en la caché con un tiempo de vida opcional."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Elimina una clave de la caché."""
        pass
