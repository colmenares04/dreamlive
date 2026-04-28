"""
Adaptadores de seguridad: JWT + hashing de contraseñas.
Encapsulan jose y passlib del resto del sistema.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
import bcrypt
from app.config import settings


class PasswordHandler:
    """Encapsula el hashing de contraseñas con bcrypt."""

    @staticmethod
    def hash(plain_password: str) -> str:
        # bcrypt native: truncamos y generamos hash
        pwd_bytes = plain_password.encode('utf-8')[:72]
        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)
        return hashed_bytes.decode('utf-8')

    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        try:
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False


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
    def create_refresh_token(
        cls,
        subject: Any,
        role: Optional[str] = None,
        user_type: Optional[str] = None,
        agency_id: Optional[Any] = None,
        extra: Optional[dict] = None,
    ) -> str:
        """
        Crea un refresh token que puede incluir claims mínimos necesarios
        para regenerar un access token (role, user_type, agency_id).
        """
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
