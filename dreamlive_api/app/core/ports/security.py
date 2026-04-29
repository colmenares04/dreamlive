"""
Puertos (interfaces) de seguridad: tokens y hashing.

La capa Application depende SOLO de estas abstracciones.
Los adaptadores concretos (jose, bcrypt) implementan estos contratos
en la capa de Adapters.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class IPasswordHasher(ABC):
    """Contrato para el servicio de hashing de contraseñas."""

    @abstractmethod
    def hash(self, plain_password: str) -> str: ...

    @abstractmethod
    def verify(self, plain_password: str, hashed_password: str) -> bool: ...


class ITokenService(ABC):
    """Contrato para el servicio de generación y validación de tokens JWT."""

    @abstractmethod
    def create_access_token(
        self,
        subject: Any,
        role: str,
        agency_id: Optional[Any] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> str: ...

    @abstractmethod
    def create_refresh_token(
        self,
        subject: Any,
        role: Optional[str] = None,
        user_type: Optional[str] = None,
        agency_id: Optional[Any] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> str: ...

    @abstractmethod
    def decode_token(self, token: str) -> Dict[str, Any]: ...
