"""
DreamLive API – Punto de entrada principal.
Registra routers, middleware CORS y crea tablas en startup.
"""
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.config import settings
from app.infrastructure.api.v1.auth import router as auth_router
from app.infrastructure.api.v2.auth import router as auth_v2_router
from app.infrastructure.api.v1.users import (
    users_router, tickets_router, audit_router
)
from app.infrastructure.api.v1 import routes as v1_routes
from app.infrastructure.api.v2 import routes as v2_routes
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Scope, Receive, Send
from app.infrastructure.middleware.handlers import (
    RequestLoggingMiddleware, register_exception_handlers
)
from app.infrastructure.middleware.rate_limit import RateLimitMiddleware


# ── Lifespan: crea tablas al iniciar ─────────────────────────────────────────
import os
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Create tables and Seed on startup ────────────────────────────────────
    try:
        from seed import run_seed
        await run_seed()
    except Exception as e:
        print(f"❌ Error during startup seeding: {e}")
    yield


# ── Ensure archives dir exists before mounting ────────────────────────────────
os.makedirs("archives/version", exist_ok=True)

# ── App ───────────────────────────────────────────────────────────────────────
fastapi_app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

fastapi_app.mount("/api/v2/archives", StaticFiles(directory="archives"), name="archives")

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
                    (b"Referrer-Policy", b"strict-origin-when-cross-origin"),
                ]
                existing_keys = {h[0].lower() for h in headers}
                for k, v in security_headers:
                    if k.lower() not in existing_keys:
                        headers.append((k, v))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

# ── Middleware Stack ─────────────────────────────────────────────────────────
fastapi_app.add_middleware(RequestLoggingMiddleware)
fastapi_app.add_middleware(RateLimitMiddleware) 
fastapi_app.add_middleware(SecurityHeadersMiddleware)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(fastapi_app)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = settings.API_PREFIX
PREFIX_V2 = settings.API_PREFIX_V2

fastapi_app.include_router(auth_router,      prefix=PREFIX)
fastapi_app.include_router(users_router,     prefix=PREFIX)
fastapi_app.include_router(tickets_router,   prefix=PREFIX)
fastapi_app.include_router(audit_router,     prefix=PREFIX)
for router in getattr(v1_routes, "ROUTERS", []):
    fastapi_app.include_router(router, prefix=PREFIX)

# --- V2 ---
for router in getattr(v2_routes, "ROUTERS", []):
    fastapi_app.include_router(router, prefix=PREFIX_V2)

@fastapi_app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


# ── Socket.io Server ─────────────────────────────────────────────────────────
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
fastapi_app.state.sio = sio

@sio.event
async def connect(sid, environ, auth=None):
    from app.adapters.security.handlers import decode_token_func
    user_id = None
    agency_id = None
    if auth and "token" in auth:
        try:
            payload = decode_token_func(auth["token"])
            user_id = str(payload.get("sub"))
            agency_id = str(payload.get("agency_id") or user_id)
        except Exception:
            pass
    await sio.save_session(sid, {"user_id": user_id, "agency_id": agency_id})
    # Auto-join global notifications room
    await sio.enter_room(sid, "notifications")

@sio.event
async def join_agency(sid, agency_id):
    await sio.enter_room(sid, str(agency_id))

@sio.event
async def join_ticket(sid, ticket_id):
    await sio.enter_room(sid, str(ticket_id))

@sio.event
async def send_message(sid, data):
    from sqlalchemy import select
    from app.adapters.db.session import async_session
    from app.adapters.db.models import TicketMessageORM, UserORM
    import uuid

    session_data = await sio.get_session(sid) or {}
    user_id = session_data.get("user_id")

    ticket_id = data.get("ticket_id")
    content = data.get("message")

    if ticket_id and content:
        async with async_session() as session:
            if not user_id:
                res = await session.execute(select(UserORM))
                first_user = res.scalars().first()
                user_id = str(first_user.id) if first_user else str(uuid.uuid4())

            msg_id = str(uuid.uuid4())
            new_msg = TicketMessageORM(
                id=msg_id,
                ticket_id=ticket_id,
                user_id=user_id,
                message=content,
            )
            session.add(new_msg)
            await session.commit()

            broadcast_payload = {
                "id": msg_id,
                "ticket_id": ticket_id,
                "user_id": user_id,
                "message": content,
                "created_at": new_msg.created_at.isoformat() if hasattr(new_msg.created_at, "isoformat") else ""
            }
            await sio.emit("chat_message", broadcast_payload, room=str(ticket_id))

@sio.event
async def disconnect(sid):
    pass

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/socket.io")

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host=settings.HOST_IP, 
        port=settings.HOST_PORT, 
        reload=True
    )
