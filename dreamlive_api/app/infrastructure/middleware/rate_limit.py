import time
import logging
from collections import defaultdict
from fastapi import status
from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.responses import JSONResponse

logger = logging.getLogger("dreamlive.security")

class RateLimitMiddleware:
    """
    Middleware ASGI puro para Rate Limiting.
    Mantiene la compatibilidad con WebSockets al no envolver la respuesta HTTP innecesariamente.
    """
    def __init__(self, app: ASGIApp, limit: int = 20, window: int = 60):
        self.app = app
        self.limit = limit
        self.window = window
        self.requests = defaultdict(list)
        # Rutas sensibles que requieren blindaje extra
        self.sensitive_routes = [
            "/api/v1/auth/login", 
            "/api/v1/auth/register", 
            "/api/v1/licenses/sync-passwords"
        ]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Si no es HTTP (ej: websocket), o no es una ruta sensible, pasar de largo inmediatamente
        if scope["type"] != "http" or scope["path"] not in self.sensitive_routes:
            return await self.app(scope, receive, send)

        # Lógica de Rate Limit por IP
        client_ip = "unknown"
        if scope.get("client"):
            client_ip = scope["client"][0]

        now = time.time()
        
        # Limpiar entradas antiguas para esta IP
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window]
        
        if len(self.requests[client_ip]) >= self.limit:
            logger.warning(f"⚠️ Rate limit excedido para IP: {client_ip} en {scope['path']}")
            response = JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas peticiones. Por favor, intenta de nuevo en un minuto."}
            )
            await response(scope, receive, send)
            return
        
        self.requests[client_ip].append(now)
            
        await self.app(scope, receive, send)
