"""
Gestión de cliente Supabase de forma sincrónica.
"""
from supabase import create_client, Client, ClientOptions
from typing import Any
from app.config import settings

_supabase_client = None

def get_supabase() -> Client:
    """Retorna un cliente sincrónico de Supabase apuntando al schema 'dreamtool'."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
            options=ClientOptions(schema="dreamtool")
        )
    return _supabase_client

async def get_db() -> Client:
    """Dependencia FastAPI que provee el cliente Supabase por request."""
    return get_supabase()
