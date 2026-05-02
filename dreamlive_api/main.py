"""
DreamLive API – Punto de entrada principal.
Registra routers, middleware CORS y crea tablas en startup.
"""
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.infrastructure.api.v1.auth import router as auth_router
from app.infrastructure.api.v1.users import (
    users_router, tickets_router, audit_router
)
from app.infrastructure.api.v1 import routes as v1_routes
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Scope, Receive, Send
from app.infrastructure.middleware.handlers import (
    RequestLoggingMiddleware, register_exception_handlers
)
from app.infrastructure.middleware.rate_limit import RateLimitMiddleware


# ── Lifespan: crea tablas al iniciar ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── Security Headers Middleware ──────────────────────────────────────────────
class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message: dict):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                security_headers = [
                    (b"X-Content-Type-Options", b"nosniff"),
                    (b"X-Frame-Options", b"DENY"),
                    (b"X-XSS-Protection", b"1; mode=block"),
                    (b"Strict-Transport-Security", b"max-age=31536000; includeSubDomains"),
                    (b"Referrer-Policy", b"strict-origin-when-cross-origin"),
                ]
                existing_keys = {h[0].lower() for h in headers}
                for k, v in security_headers:
                    if k.lower() not in existing_keys:
                        headers.append((k, v))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

class CustomCORSMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        method = scope.get("method", "")
        headers = dict(scope.get("headers", []))
        origin = headers.get(b"origin", b"").decode("utf-8")

        if method == "OPTIONS":
            # Direct response for CORS preflight
            response_headers = [
                (b"access-control-allow-origin", origin.encode("utf-8") if origin else b"*"),
                (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                (b"access-control-allow-headers", b"Authorization, Content-Type, Accept, Origin, X-Requested-With"),
                (b"access-control-allow-credentials", b"true"),
                (b"access-control-max-age", b"86400"),
            ]
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": response_headers
            })
            await send({
                "type": "http.response.body",
                "body": b"",
                "more_body": False
            })
            return

        # For non-OPTIONS requests, add CORS headers to outgoing response
        async def send_wrapper(message: dict):
            if message["type"] == "http.response.start":
                msg_headers = list(message.get("headers", []))
                has_origin = any(h[0].lower() == b"access-control-allow-origin" for h in msg_headers)
                if not has_origin:
                    msg_headers.extend([
                        (b"access-control-allow-origin", origin.encode("utf-8") if origin else b"*"),
                        (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                        (b"access-control-allow-headers", b"Authorization, Content-Type, Accept, Origin, X-Requested-With"),
                        (b"access-control-allow-credentials", b"true"),
                    ])
                message["headers"] = msg_headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

# ── Middleware Stack ─────────────────────────────────────────────────────────
# Nota: El orden de add_middleware es inverso al de ejecución.
# El último añadido es el PRIMERO en recibir la petición.

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware) 
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CustomCORSMiddleware)

register_exception_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = settings.API_PREFIX

app.include_router(auth_router,      prefix=PREFIX)
app.include_router(users_router,     prefix=PREFIX)
app.include_router(tickets_router,   prefix=PREFIX)
app.include_router(audit_router,     prefix=PREFIX)

for router in getattr(v1_routes, "ROUTERS", []):
    app.include_router(router, prefix=PREFIX)

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host=settings.HOST_IP, 
        port=settings.HOST_PORT, 
        reload=True
    )
