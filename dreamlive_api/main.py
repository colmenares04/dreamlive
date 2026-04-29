"""
DreamLive API – Punto de entrada principal.
Registra routers, middleware CORS y crea tablas en startup.
"""
import uvicorn
import socketio
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

# ── CORS & Security Headers ──────────────────────────────────────────────────
_cors_origins = [
    "http://217.216.94.178", "http://127.0.0.1",
    "http://217.216.94.178:5173", "http://127.0.0.1:5173",
    "http://217.216.94.178:3000", "http://127.0.0.1:3000"
]
if settings.ALLOWED_ORIGINS:
    _cors_origins = list(set(_cors_origins + settings.ALLOWED_ORIGINS))
print(f"CORS activo para orígenes: {_cors_origins}")

class SecurityHeadersMiddleware:
    """
    Middleware ASGI puro para inyectar cabeceras de seguridad.
    Diseñado para ser transparente y no interferir con protocolos de red (como WebSockets).
    """
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
                    (b"Content-Security-Policy", b"default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;")
                ]
                
                existing_keys = {h[0].lower() for h in headers}
                for k, v in security_headers:
                    if k.lower() not in existing_keys:
                        headers.append((k, v))
                
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware) 
app.add_middleware(RequestLoggingMiddleware)
register_exception_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = settings.API_PREFIX

app.include_router(auth_router,      prefix=PREFIX)
app.include_router(users_router,     prefix=PREFIX)
app.include_router(tickets_router,   prefix=PREFIX)
app.include_router(audit_router,     prefix=PREFIX)

for router in getattr(v1_routes, "ROUTERS", []):
    app.include_router(router, prefix=PREFIX)

# ── ASGI Wrapper (The "Standard" Way) ────────────────────────────────────────
# Envolvemos la app de FastAPI con Socket.io (Ruta estándar /socket.io)
from app.infrastructure.api.v1.socket_manager import sio
main_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path='socket.io')


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}

# --- Ejecución ---
if __name__ == "__main__":
    print(f"SUPABASE URL DETECTADA: {settings.SUPABASE_URL}")
    uvicorn.run(
        "main:main_app", 
        host=settings.HOST_IP, 
        port=settings.HOST_PORT, 
        reload=True
    )
