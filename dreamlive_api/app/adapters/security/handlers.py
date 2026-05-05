"""
Adaptadores de seguridad: JWT + hashing de contraseñas.
Encapsulan jose y bcrypt del resto del sistema.

Implementan los puertos IPasswordHasher e ITokenService definidos en Core.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from jose import jwt, JWTError
import bcrypt

from app.config import settings
from app.core.ports.security import IPasswordHasher, ITokenService


class PasswordHandler(IPasswordHasher):
    """Implementación de IPasswordHasher con bcrypt."""

    def hash(self, plain_password: str) -> str:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)
        return hashed_bytes.decode("utf-8")

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        try:
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False


class JWTHandler(ITokenService):
    """Implementación de ITokenService con python-jose."""

    def _encode(self, payload: dict) -> str:
        return jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    def _decode(self, token: str) -> dict:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

    def create_access_token(
        self,
        subject: Any,
        role: str,
        agency_id: Optional[Any] = None,
        extra: Optional[Dict[str, Any]] = None,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        payload = {
            "sub": str(subject),
            "role": role,
            "agency_id": agency_id,
            "type": "access",
            "exp": expire,
            **(extra or {}),
        }
        return self._encode(payload)

    def create_refresh_token(
        self,
        subject: Any,
        role: Optional[str] = None,
        user_type: Optional[str] = None,
        agency_id: Optional[Any] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        payload = {"sub": str(subject), "type": "refresh", "exp": expire, **(extra or {})}
        if role is not None:
            payload["role"] = role
        if user_type is not None:
            payload["user_type"] = user_type
        if agency_id is not None:
            payload["agency_id"] = agency_id
        return self._encode(payload)

    def decode_token(self, token: str) -> Dict[str, Any]:
        try:
            return self._decode(token)
        except JWTError as exc:
            from app.core.domain.exceptions import UnauthorizedAccess
            raise UnauthorizedAccess(f"Token inválido: {exc}")


_pwd_handler = PasswordHandler()
_jwt_handler = JWTHandler()

def hash_password(plain_password: str) -> str:
    return _pwd_handler.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_handler.verify(plain_password, hashed_password)

def create_access_token(subject: Any, role: str, agency_id: Optional[Any] = None, extra: Optional[Dict[str, Any]] = None, expires_delta: Optional[timedelta] = None) -> str:
    return _jwt_handler.create_access_token(subject, role, agency_id, extra, expires_delta)

def decode_token_func(token: str) -> Dict[str, Any]:
    return _jwt_handler.decode_token(token)

