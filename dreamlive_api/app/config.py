"""
DreamLive – Configuración central de la aplicación.
Carga variables de entorno con validación Pydantic.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    # ── Aplicación ────────────────────────────────────────────────────────────
    APP_NAME: str = "DreamLive API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    HOST_IP: str = "0.0.0.0"
    HOST_PORT: int = 8000

    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # ── Seguridad JWT ─────────────────────────────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
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

    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        if not v.startswith("http"):
            raise ValueError("URL de Supabase inválida.")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
