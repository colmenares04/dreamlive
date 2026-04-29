import json
import logging
from typing import Any, Optional
import redis.asyncio as redis
from app.config import settings
from app.core.ports.cache import ICacheService

logger = logging.getLogger("dreamlive.cache")

class RedisCacheService(ICacheService):
    """
    Servicio de caché basado en Redis para acelerar consultas pesadas
    y reducir la carga a la base de datos principal.
    """
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        if settings.ENABLE_CACHE:
            self._redis = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=True
            )

    async def get(self, key: str) -> Optional[Any]:
        if not self._redis: return None
        try:
            data = await self._redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Error recuperando llave {key} de Redis: {e}")
        return None

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = 60) -> None:
        if not self._redis: return False
        try:
            await self._redis.set(
                key, 
                json.dumps(value), 
                ex=ttl_seconds
            )
            return True
        except Exception as e:
            logger.warning(f"Error guardando llave {key} en Redis: {e}")
        return False

    async def delete(self, key: str) -> bool:
        if not self._redis: return False
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Error eliminando llave {key} de Redis: {e}")
        return False

# Singleton instance
cache_service = RedisCacheService()
