"""
Pydantic schemas compartidos para la API.
Centraliza respuestas de autenticación y otros modelos ligeros.
"""
from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    agency_id: str | None
