from fastapi import APIRouter, Depends, HTTPException, status
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

class LinkLicenseRequest(BaseModel):
    licenseKey: str
    email: EmailStr
    password: str
    fullName: str
    device_id: str = "unknown"
    browser: str | None = None
    os: str | None = None

# --- Routes ---

@router.post("/login-license", response_model=LoginLicenseResponse)
async def login_license(
    payload: LoginLicenseRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.key == payload.licenseKey))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=401, detail="Licencia inválida.")

    session_id = str(uuid.uuid4())
    new_session = LicenseSessionORM(
        id=session_id,
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser=payload.browser,
        os=payload.os,
        last_ping=datetime.datetime.utcnow()
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
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.email == payload.email))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=401, detail="Usuario no encontrado.")

    if not verify_password(payload.password, lic.admin_password) and lic.admin_password != payload.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    session_id = str(uuid.uuid4())
    new_session = LicenseSessionORM(
        id=session_id,
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser=payload.browser,
        os=payload.os,
        last_ping=datetime.datetime.utcnow()
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
    from sqlalchemy import select
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.key == payload.licenseKey))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    lic.email = payload.email
    lic.admin_password = payload.password
    lic.recruiter_name = payload.fullName
    uow.session.add(lic)
    
    session_id = str(uuid.uuid4())
    new_session = LicenseSessionORM(
        id=session_id,
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser=payload.browser,
        os=payload.os,
        last_ping=datetime.datetime.utcnow()
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

@router.get("/me")
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if not lic:
            raise HTTPException(status_code=404, detail="Licencia no encontrada.")

        # Cálculo de tiempo para reinicio (simulado o basado en lógica real)
        import datetime
        tiempo_reinicio = 0
        if lic.last_contact_date:
            next_reset = lic.last_contact_date + datetime.timedelta(hours=24)
            now = datetime.datetime.utcnow()
            if next_reset > now:
                tiempo_reinicio = int((next_reset - now).total_seconds())

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
            "tiempo_para_reinicio": tiempo_reinicio
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido.")
