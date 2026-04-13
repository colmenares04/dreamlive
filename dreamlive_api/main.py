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
from app.infrastructure.api.v1.routes import (
    licenses_router, agencies_router, leads_router,
    versions_router, overview_router, dashboard_router,
)
from app.infrastructure.middleware.handlers import (
    RequestLoggingMiddleware, register_exception_handlers
)


# ── Lifespan: crea tablas al iniciar ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# En modo DEBUG, permite cualquier origen para facilitar el desarrollo local
_cors_origins = ["*"] if settings.DEBUG else settings.ALLOWED_ORIGINS
print(f"CORS activo para orígenes: {_cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=not settings.DEBUG,  # credentials no puede ir con wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
register_exception_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = settings.API_PREFIX

app.include_router(auth_router,      prefix=PREFIX)
app.include_router(users_router,     prefix=PREFIX)
app.include_router(tickets_router,   prefix=PREFIX)
app.include_router(audit_router,     prefix=PREFIX)
app.include_router(licenses_router,  prefix=PREFIX)
app.include_router(agencies_router,  prefix=PREFIX)
app.include_router(leads_router,     prefix=PREFIX)
app.include_router(versions_router,  prefix=PREFIX)
app.include_router(overview_router,  prefix=PREFIX)
app.include_router(dashboard_router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}

# --- Ejecución ---
if __name__ == "__main__":
    print(f"SUPABASE URL DETECTADA: {settings.SUPABASE_URL}")
    uvicorn.run(
        "main:app", 
        host=settings.HOST_IP, 
        port=settings.HOST_PORT, 
        reload=True
    )
