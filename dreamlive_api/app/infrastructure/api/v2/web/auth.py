from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.security.handlers import hash_password, create_access_token, decode_token_func, verify_password
from app.adapters.db.models import AgencyORM, LicenseORM

router = APIRouter(prefix="/auth", tags=["Auth Web V2"])
bearer_scheme = HTTPBearer(auto_error=False)

# --- Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    role: str
    user_id: str
    agency_id: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserOut(BaseModel):
    id: str | None
    email: str
    username: str
    full_name: str
    role: str
    status: str
    agency_id: str | None
    license_id: str | None = None
    logo_url: str | None = None
    limite_diario: int = 60
    usados_hoy: int = 0
    tiempo_para_reinicio: int = 0

class SelectProfileRequest(BaseModel):
    user_id: str
    password: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    agency_id: Optional[str] = None

# --- Routes ---

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.email == payload.email))
    agency = res.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    if not verify_password(payload.password, agency.password) and agency.password != payload.password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    access_token = create_access_token(
        subject=str(agency.id),
        role="agency_session",
        agency_id=str(agency.id),
        extra={"user_type": "agency"},
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=access_token,
        role="agency_session",
        user_id=str(agency.id),
        agency_id=str(agency.id),
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload_req: RefreshRequest,
    uow: Any = Depends(get_uow),
):
    try:
        payload = decode_token_func(payload_req.refresh_token)
        subject_id = str(payload["sub"])
        user_role = payload.get("role", "agency_admin")
        agency_id = payload.get("agency_id")
        user_type = payload.get("user_type", "agency")

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

@router.get("/me", response_model=UserOut)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    if not credentials or not credentials.credentials:
        # Fallback para debug/inicialización si no hay token
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        if agency:
            return UserOut(
                id=str(agency.id), email=agency.email, username=agency.name,
                full_name=agency.name, role="agency_admin", status="active", agency_id=str(agency.id)
            )
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        # 1. Buscar en Agencias
        res_agency = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == subject_id))
        agency = res_agency.scalar_one_or_none()
        if agency:
            return UserOut(
                id=str(agency.id), email=agency.email, username=agency.name,
                full_name=agency.name, role="agency_admin", status="active", agency_id=str(agency.id)
            )

        # 2. Buscar en Licencias (Perfiles vinculados)
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if lic:
            return UserOut(
                id=str(lic.id), email=lic.email or "", username=lic.recruiter_name or "",
                full_name=lic.recruiter_name or "", role=lic.role or "agency_admin", status="active",
                agency_id=str(lic.agency_id) if lic.agency_id else None
            )

        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido.")

@router.post("/users/select", response_model=TokenResponse)
async def select_profile(
    payload: SelectProfileRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    # Lógica para cambiar entre perfiles de la agencia
    res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == payload.user_id))
    lic = res_lic.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Perfil no encontrado.")

    access_token = create_access_token(
        subject=str(lic.id),
        role=lic.role or "agency_admin",
        agency_id=str(lic.agency_id),
        extra={"user_type": "agency", "role": lic.role or "agency_admin"},
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=access_token,
        role=lic.role or "agency_admin",
        user_id=str(lic.id),
        agency_id=str(lic.agency_id),
    )

@router.get("/agency/users")
async def get_agency_users(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    # En este sistema, los "users" de la agencia son las licencias configuradas con email/pass
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.agency_id == str(agency.id)))
    lics = res.scalars().all()
    
    return [
        {
            "id": str(l.id),
            "username": l.recruiter_name,
            "email": l.email,
            "role": l.role or "agency_admin",
            "has_password": bool(l.admin_password)
        } for l in lics if l.email
    ]

@router.post("/register")
async def register(
    payload: RegisterRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    import uuid
    
    # 1. Verificar si ya existe
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.email == payload.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")
        
    agency_id = str(uuid.uuid4())
    new_agency = AgencyORM(
        id=agency_id,
        name=payload.username,
        email=payload.email,
        password=hash_password(payload.password) if hasattr(payload, "password") else payload.password,
        is_active=True,
    )
    uow.session.add(new_agency)
    await uow.session.commit()
    return {"user_id": agency_id}

@router.post("/password-reset/request")
async def request_password_reset(email: str):
    # Mock para cumplir con el contrato del frontend
    return {"status": "ok", "message": "Si el correo existe, recibirás instrucciones."}

@router.post("/password-reset/confirm")
async def confirm_password_reset(token: str, new_password: str):
    # Mock para cumplir con el contrato del frontend
    return {"status": "ok"}
