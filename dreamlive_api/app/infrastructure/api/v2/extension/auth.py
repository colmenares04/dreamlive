from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from typing import Any, Optional
import uuid
import datetime

from app.infrastructure.api.deps import get_uow
from app.adapters.security.handlers import create_access_token, verify_password, decode_token_func
from app.adapters.db.models import LicenseORM, LicenseSessionORM
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["Auth Extension V2"])
bearer_scheme = HTTPBearer(auto_error=False)

# --- Schemas ---
class LoginLicenseRequest(BaseModel):
    licenseKey: str
    device_id: str = "unknown"
    browser: str | None = None
    os: str | None = None
    force: bool = False

class LoginLicenseResponse(BaseModel):
    license: dict
    hasAdminUser: bool
    token: str
    session_id: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    role: str
    user_id: str
    agency_id: str

class RefreshRequest(BaseModel):
    refresh_token: str

class LoginExtensionRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str = "unknown"
    browser: str | None = None
    os: str | None = None
    force: bool = False

class LinkLicenseRequest(BaseModel):
    licenseKey: str
    email: EmailStr
    password: str
    fullName: str
    device_id: str = "unknown"
    browser: str | None = None
    os: str | None = None
    force: bool = False

# --- Routes ---

@router.post("/login-license", response_model=LoginLicenseResponse)
async def login_license(
    payload: LoginLicenseRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func, delete
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.key == payload.licenseKey))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=401, detail="Licencia inválida.")

    # --- Lógica de expulsión (Kick-out) ---
    max_dev = lic.max_devices or 1
    # Contar sesiones activas
    active_threshold = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)
    stmt_count = select(func.count(LicenseSessionORM.id)).where(
        LicenseSessionORM.license_id == str(lic.id),
        LicenseSessionORM.last_ping >= active_threshold
    )
    res_count = await uow.session.execute(stmt_count)
    active_count = res_count.scalar() or 0

    if active_count >= max_dev:
        if not payload.force:
            raise HTTPException(
                status_code=403, 
                detail={
                    "code": "LIMIT_REACHED", 
                    "message": f"Límite de {max_dev} sesiones alcanzado. ¿Desconectar la otra?",
                    "active": active_count,
                    "max": max_dev
                }
            )

        # Obtener la sesión más antigua DE LAS ACTIVAS
        stmt_oldest = select(LicenseSessionORM).where(
            LicenseSessionORM.license_id == str(lic.id),
            LicenseSessionORM.last_ping >= active_threshold
        ).order_by(LicenseSessionORM.last_ping.asc()).limit(active_count - max_dev + 1)
        
        res_oldest = await uow.session.execute(stmt_oldest)
        old_sessions = res_oldest.scalars().all()
        
        for old_s in old_sessions:
            # Notificar expulsión via WebSocket
            from app.infrastructure.api.v2.socket_manager import socket_manager
            await socket_manager.emit_to_session(
                old_s.id, 
                "FORCE_LOGOUT", 
                {"reason": "Se ha iniciado sesión en otro dispositivo. Límite alcanzado."}
            )
            # Eliminar sesión de la DB
            await uow.session.delete(old_s)
        
        await uow.session.flush()

    session_id = str(uuid.uuid4())
    new_session = LicenseSessionORM(
        id=session_id,
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser=payload.browser,
        os=payload.os,
        last_ping=datetime.datetime.now(datetime.timezone.utc)
    )
    uow.session.add(new_session)
    await uow.session.flush()
    await uow.session.commit()

    token = create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={"id": str(lic.id), "key": lic.key, "status": "active"},
        hasAdminUser=bool(lic.email),
        token=token,
        session_id=session_id
    )

@router.post("/login-extension", response_model=LoginLicenseResponse)
async def login_extension(
    payload: LoginExtensionRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.email == payload.email))
    lic = res.scalar_one_or_none()
    
    if not lic:
        raise HTTPException(status_code=401, detail="Usuario o licencia no encontrada.")

    # --- Lógica de expulsión (Kick-out) ---
    max_dev = lic.max_devices or 1
    # Contar sesiones activas
    active_threshold = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)
    stmt_count = select(func.count(LicenseSessionORM.id)).where(
        LicenseSessionORM.license_id == str(lic.id),
        LicenseSessionORM.last_ping >= active_threshold
    )
    res_count = await uow.session.execute(stmt_count)
    active_count = res_count.scalar() or 0

    if active_count >= max_dev:
        if not payload.force:
            raise HTTPException(
                status_code=403, 
                detail={
                    "code": "LIMIT_REACHED", 
                    "message": f"Límite de {max_dev} sesiones alcanzado. ¿Desconectar la otra?",
                    "active": active_count,
                    "max": max_dev
                }
            )

        # Obtener la sesión más antigua DE LAS ACTIVAS
        stmt_oldest = select(LicenseSessionORM).where(
            LicenseSessionORM.license_id == str(lic.id),
            LicenseSessionORM.last_ping >= active_threshold
        ).order_by(LicenseSessionORM.last_ping.asc()).limit(active_count - max_dev + 1)
        
        res_oldest = await uow.session.execute(stmt_oldest)
        old_sessions = res_oldest.scalars().all()
        
        for old_s in old_sessions:
            # Notificar expulsión via WebSocket
            from app.infrastructure.api.v2.socket_manager import socket_manager
            await socket_manager.emit_to_session(
                old_s.id, 
                "FORCE_LOGOUT", 
                {"reason": "Se ha iniciado sesión en otro dispositivo. Límite alcanzado."}
            )
            # Eliminar sesión de la DB
            await uow.session.delete(old_s)
        
        await uow.session.flush()

    if not verify_password(payload.password, lic.admin_password) and lic.admin_password != payload.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    session_id = str(uuid.uuid4())
    new_session = LicenseSessionORM(
        id=session_id,
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser=payload.browser,
        os=payload.os,
        last_ping=datetime.datetime.now(datetime.timezone.utc)
    )
    uow.session.add(new_session)
    await uow.session.flush()
    await uow.session.commit()

    token = create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={"id": str(lic.id), "key": lic.key, "status": "active"},
        hasAdminUser=True,
        token=token,
        session_id=session_id
    )

@router.post("/link-license", response_model=LoginLicenseResponse)
async def link_license(
    payload: LinkLicenseRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.key == payload.licenseKey))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    # --- Lógica de expulsión (Kick-out) ---
    max_dev = lic.max_devices or 1
    # Contar sesiones activas
    active_threshold = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)
    stmt_count = select(func.count(LicenseSessionORM.id)).where(
        LicenseSessionORM.license_id == str(lic.id),
        LicenseSessionORM.last_ping >= active_threshold
    )
    res_count = await uow.session.execute(stmt_count)
    active_count = res_count.scalar() or 0

    if active_count >= max_dev:
        if not payload.force:
            raise HTTPException(
                status_code=403, 
                detail={
                    "code": "LIMIT_REACHED", 
                    "message": f"Límite de {max_dev} sesiones alcanzado. ¿Desconectar la otra?",
                    "active": active_count,
                    "max": max_dev
                }
            )

        # Obtener la sesión más antigua DE LAS ACTIVAS
        stmt_oldest = select(LicenseSessionORM).where(
            LicenseSessionORM.license_id == str(lic.id),
            LicenseSessionORM.last_ping >= active_threshold
        ).order_by(LicenseSessionORM.last_ping.asc()).limit(active_count - max_dev + 1)
        
        res_oldest = await uow.session.execute(stmt_oldest)
        old_sessions = res_oldest.scalars().all()
        
        for old_s in old_sessions:
            # Notificar expulsión via WebSocket
            from app.infrastructure.api.v2.socket_manager import socket_manager
            await socket_manager.emit_to_session(
                old_s.id, 
                "FORCE_LOGOUT", 
                {"reason": "Se ha iniciado sesión en otro dispositivo. Límite alcanzado."}
            )
            # Eliminar sesión de la DB
            await uow.session.delete(old_s)
        
        await uow.session.flush()

    session_id = str(uuid.uuid4())
    lic.email = payload.email
    lic.admin_password = payload.password
    lic.recruiter_name = payload.fullName
    uow.session.add(lic)
    
    new_session = LicenseSessionORM(
        id=session_id,
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser=payload.browser,
        os=payload.os,
        last_ping=datetime.datetime.now(datetime.timezone.utc)
    )
    uow.session.add(new_session)
    await uow.session.flush()
    await uow.session.commit()

    token = create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={"id": str(lic.id), "key": lic.key, "status": "active"},
        hasAdminUser=True,
        token=token,
        session_id=session_id
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload_req: RefreshRequest,
    uow: Any = Depends(get_uow),
):
    try:
        payload = decode_token_func(payload_req.refresh_token)
        subject_id = str(payload["sub"])
        user_role = payload.get("role", "agent")
        agency_id = payload.get("agency_id")
        user_type = payload.get("user_type", "license")

        new_access = create_access_token(
            subject=subject_id,
            role=user_role,
            agency_id=agency_id,
            extra={"user_type": user_type, "role": user_role},
        )
        
        return TokenResponse(
            access_token=new_access,
            refresh_token=payload_req.refresh_token,
            role=user_role,
            user_id=subject_id,
            agency_id=agency_id or subject_id,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado.")

@router.post("/logout-all")
async def logout_all(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        from sqlalchemy import select, delete
        # Obtener todas las sesiones de esta licencia
        res_sess = await uow.session.execute(select(LicenseSessionORM).where(LicenseSessionORM.license_id == subject_id))
        sessions = res_sess.scalars().all()
        
        from app.infrastructure.api.v2.socket_manager import socket_manager
        for s in sessions:
            # Notificar a todas (incluyendo la actual, para que todas reinicien)
            await socket_manager.emit_to_session(
                s.id, 
                "FORCE_LOGOUT", 
                {"reason": "Se han desconectado todas las sesiones manualmente."}
            )
            await uow.session.delete(s)
            
        await uow.session.commit()
        return {"success": True, "message": "Todas las sesiones han sido cerradas."}
    except Exception as e:
        print(f"Error in logout_all: {e}")
        raise HTTPException(status_code=500, detail="Error al cerrar sesiones.")

@router.get("/me")
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    from sqlalchemy import select, func
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if not lic:
            raise HTTPException(status_code=404, detail="Licencia no encontrada.")

        # Actualizar last_ping si tenemos session_id
        if x_session_id:
            # Validar que la sesión EXISTE
            res_sess = await uow.session.execute(select(LicenseSessionORM).where(LicenseSessionORM.id == x_session_id))
            sess = res_sess.scalar_one_or_none()
            
            if not sess:
                raise HTTPException(status_code=401, detail="Sesión inválida o expulsada.")

            from sqlalchemy import update
            await uow.session.execute(
                update(LicenseSessionORM)
                .where(LicenseSessionORM.id == x_session_id)
                .values(last_ping=datetime.datetime.now(datetime.timezone.utc))
            )
            await uow.session.commit()

        # Cálculo de tiempo para reinicio
        tiempo_reinicio = 0
        if lic.last_contact_date:
            refresh_m = lic.refresh_minutes or 1440
            next_reset = lic.last_contact_date + datetime.timedelta(minutes=refresh_m)
            now = datetime.datetime.now(datetime.timezone.utc)
            if next_reset > now:
                tiempo_reinicio = int((next_reset - now).total_seconds())

        # Contar sesiones activas (pings en los últimos 5 minutos)
        active_threshold = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
        stmt_sessions = select(func.count(LicenseSessionORM.id)).where(
            LicenseSessionORM.license_id == str(lic.id),
            LicenseSessionORM.last_ping >= active_threshold
        )
        res_sessions = await uow.session.execute(stmt_sessions)
        active_sessions = res_sessions.scalar() or 0

        return {
            "id": str(lic.id),
            "key": lic.key,
            "agency_id": str(lic.agency_id),
            "email": lic.email,
            "username": lic.recruiter_name or "Agente",
            "full_name": lic.recruiter_name or "Agente",
            "status": "active",
            "limite_diario": lic.request_limit or 60,
            "usados_hoy": lic.daily_contact_count or 0,
            "tiempo_para_reinicio": tiempo_reinicio,
            "active_sessions": active_sessions,
            "max_sessions": lic.max_devices or 1
        }
    except Exception as e:
        print(f"Error in get_me: {e}")
        raise HTTPException(status_code=401, detail="Token inválido.")
