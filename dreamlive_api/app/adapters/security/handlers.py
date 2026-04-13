"""
Adaptadores de seguridad: JWT + hashing de contraseñas.
Encapsulan jose y passlib del resto del sistema.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings

# ── Passlib context ───────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class PasswordHandler:
    """Encapsula el hashing de contraseñas con bcrypt."""

    @staticmethod
    def hash(plain_password: str) -> str:
        return _pwd_context.hash(plain_password)

    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        return _pwd_context.verify(plain_password, hashed_password)


# ── JWT ───────────────────────────────────────────────────────────────────────
class JWTHandler:
    """Genera y verifica tokens JWT (access + refresh)."""

    @staticmethod
    def _encode(payload: dict) -> str:
        return jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

    @staticmethod
    def _decode(token: str) -> dict:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

    @classmethod
    def create_access_token(
        cls,
        subject: Any,
        role: str,
        agency_id: Optional[int] = None,
        extra: Optional[dict] = None,
    ) -> str:
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
        return cls._encode(payload)

    @classmethod
    def create_refresh_token(cls, subject: Any) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        payload = {"sub": str(subject), "type": "refresh", "exp": expire}
        return cls._encode(payload)

    @classmethod
    def decode_token(cls, token: str) -> dict:
        """
        Decodifica y valida un token JWT.
        Lanza JWTError si es inválido o expirado.
        """
        try:
            return cls._decode(token)
        except JWTError as exc:
            raise ValueError(f"Token inválido: {exc}") from exc

    @classmethod
    def get_subject(cls, token: str) -> str:
        payload = cls.decode_token(token)
        return payload["sub"]
