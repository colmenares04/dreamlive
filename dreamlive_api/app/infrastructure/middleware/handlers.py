"""
Middleware de la aplicación:
  - RequestLoggingMiddleware: Logea método, ruta, status y tiempo de respuesta.
  - GlobalExceptionHandler: Captura excepciones no manejadas y retorna JSON limpio.
"""
import time
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("dreamlive")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


from starlette.types import ASGIApp, Scope, Receive, Send

class RequestLoggingMiddleware:
    """
    Middleware ASGI puro para logging de peticiones.
    Evita envolver respuestas de WebSocket, resolviendo interferencias de protocolo.
    """
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        start = time.perf_counter()
        path = scope["path"]
        method = scope["method"]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                duration_ms = (time.perf_counter() - start) * 1000
                logger.info(
                    "%s %s → %d (%.1fms)",
                    method, path, status_code, duration_ms
                )
            await send(message)

        await self.app(scope, receive, send_wrapper)


def register_exception_handlers(app: FastAPI) -> None:
    """Registra handlers globales de excepciones en la app FastAPI."""

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc)},
        )

    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError):
        return JSONResponse(
            status_code=403,
            content={"detail": str(exc)},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        import traceback
        stack = traceback.format_exc()
        logger.error("Unhandled exception on %s: %s\n%s", request.url.path, exc, stack)
        
        # NOTE: Deshabilitado el logueo a DB en el handler para evitar fallos en cascada.
        # Los errores críticos ya se registran en los logs del servidor (Uvicorn).

        return JSONResponse(
            status_code=500,
            content={"detail": "Error interno del servidor. El equipo técnico ha sido notificado."},
        )
