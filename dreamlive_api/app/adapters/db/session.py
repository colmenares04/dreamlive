"""
Gestión de conexión a base de datos PostgreSQL pura con SQLAlchemy.
Configuración de motor asíncrono y creador de sesiones.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings

# Creación del motor asíncrono utilizando asyncpg
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True
)

# Creador de sesiones asíncronas
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia FastAPI que provee la sesión asíncrona por request."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
