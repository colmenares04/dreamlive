"""
DreamLive – Configuración central de la aplicación.
Carga variables de entorno con validación Pydantic.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union, Any
import secrets


class Settings(BaseSettings):
    # ── Aplicación ────────────────────────────────────────────────────────────
    APP_NAME: str = "DreamLive API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    API_PREFIX_V2: str = "/api/v2"
    HOST_IP: str = "0.0.0.0"
    HOST_PORT: int = 8000

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/dreamlive"

    # ── Seguridad JWT ─────────────────────────────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas para estabilidad en extensión
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────────
    DOMAIN_NAME: str = "dreamlive.app"
    API_DOMAIN_NAME: str = "api.dreamlive.app"
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "https://dreamlive.app",
        "https://api.dreamlive.app",
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # ── Email (recuperación de contraseña) ───────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "no-reply@dreamlive.com"

    # ── Google reCAPTCHA v2 ───────────────────────────────────────────────────
    RECAPTCHA_SECRET_KEY: str = ""
    RECAPTCHA_VERIFY_URL: str = (
        "https://www.google.com/recaptcha/api/siteverify"
    )

    # ── Almacenamiento (S3 / compatible) ─────────────────────────────────────
    STORAGE_BUCKET: str = "dreamlive-updates"
    AWS_ACCESS_KEY: str = ""
    AWS_SECRET_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # ── Redis (Caché) ─────────────────────────────────────────────────────────
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    ENABLE_CACHE: bool = True

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def validate_allowed_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
