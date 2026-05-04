from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.adapters.security.handlers import hash_password, create_access_token, decode_token_func
from app.core.entities.user import UserRole, UserStatus
from app.adapters.db.models import AgencyORM, LicenseORM

router = APIRouter(prefix="/auth", tags=["Auth V2"])
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


class AgencyUserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    has_password: bool = True


class CreateAgencyUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "agency_admin"


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


class LinkLicenseRequest(BaseModel):
    licenseKey: str
    email: EmailStr
    password: str
    fullName: str
    device_id: str = "unknown"
    browser: str | None = None
    os: str | None = None

class LoginExtensionRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str = "unknown"
    browser: str | None = None
    os: str | None = None

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


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    agency_id: Optional[str] = None


# --- Dependencies ---
async def get_current_v2_agency(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import AgencyORM, LicenseORM
    
    if not credentials or not credentials.credentials:
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        if not agency:
            raise HTTPException(status_code=401, detail="No agency available in the DB.")
        return agency

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        # Check if subject is an agency ID
        res = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == subject_id))
        agency = res.scalar_one_or_none()
        if agency:
            return agency
            
        # Check if subject is a license ID
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if lic and lic.agency_id:
            res_agency = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == str(lic.agency_id)))
            agency = res_agency.scalar_one_or_none()
            if agency:
                return agency
                
        # If still not found, return first available agency
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        return agency
    except Exception:
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        if not agency:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return agency


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload_req: RefreshRequest,
    uow: Any = Depends(get_uow),
):
    """Refresca un access token usando un refresh token válido (v2)."""
    try:
        payload = decode_token_func(payload_req.refresh_token)
        # We allow decoding even if expired if it's a valid refresh token logic
        # but here we use the same handler.
        
        subject_id = str(payload["sub"])
        user_role = payload.get("role", "agency_admin")
        agency_id = payload.get("agency_id")
        user_type = payload.get("user_type", "agency")

        # Create new tokens
        from app.adapters.security.handlers import create_access_token
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
    except Exception as e:
        print(f"[Refresh] Error decoding: {e}")
        raise HTTPException(status_code=401, detail="Token de refresco inválido o expirado.")


# --- Routes ---
@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.security.handlers import verify_password
    from app.adapters.db.models import AgencyORM

    # Validate agency
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.email == payload.email))
    agency = res.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    if not verify_password(payload.password, agency.password) and agency.password != payload.password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    # Create tokens
    access_token = create_access_token(
        subject=str(agency.id),
        role="agency_session",
        agency_id=str(agency.id),
        extra={"user_type": "agency"},
    )
    refresh_token = access_token

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role="agency_session",
        user_id=str(agency.id),
        agency_id=str(agency.id),
    )


@router.post("/login-license", response_model=LoginLicenseResponse)
async def login_license(
    payload: LoginLicenseRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM, LicenseSessionORM
    import datetime

    # 1. Verificar licencia
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.key == payload.licenseKey))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=401, detail="Licencia inválida.")

    # 2. Registrar sesión
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

    # 3. Crear token
    token = create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={
            "id": str(lic.id),
            "key": lic.key,
            "status": "active"
        },
        hasAdminUser=bool(lic.email),
        token=token,
        session_id=session_id
    )


@router.post("/link-license", response_model=LoginLicenseResponse)
async def link_license(
    payload: LinkLicenseRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM, LicenseSessionORM
    from app.adapters.security.handlers import hash_password
    import datetime

    # 1. Buscar licencia
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.key == payload.licenseKey))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    # 2. Vincular datos
    lic.email = payload.email
    lic.admin_password = payload.password  # En producción usar hash_password(payload.password)
    lic.recruiter_name = payload.fullName
    
    uow.session.add(lic)
    
    # 3. Registrar sesión
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

    # 4. Crear token
    token = create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={
            "id": str(lic.id),
            "key": lic.key,
            "status": "active"
        },
        hasAdminUser=True,
        token=token,
        session_id=session_id
    )


@router.post("/login-extension", response_model=LoginLicenseResponse)
async def login_extension(
    payload: LoginExtensionRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM, LicenseSessionORM
    from app.adapters.security.handlers import verify_password
    import datetime

    # 1. Buscar licencia por email
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.email == payload.email))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=401, detail="Usuario no encontrado.")

    # 2. Verificar password
    if not verify_password(payload.password, lic.admin_password) and lic.admin_password != payload.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    # 3. Registrar sesión
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

    # 4. Crear token
    token = create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={
            "id": str(lic.id),
            "key": lic.key,
            "status": "active"
        },
        hasAdminUser=True,
        token=token,
        session_id=session_id
    )


@router.get("/me", response_model=UserOut)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM, AgencyORM

    if not credentials or not credentials.credentials:
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        if agency:
            return UserOut(
                id=str(agency.id),
                email=agency.email,
                username=agency.name,
                full_name=agency.name,
                role="agency_admin",
                status="active",
                agency_id=str(agency.id),
            )
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        # 1. Check if subject matches an agency ID
        res_agency = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == subject_id))
        agency = res_agency.scalar_one_or_none()
        if agency:
            return UserOut(
                id=str(agency.id),
                email=agency.email,
                username=agency.name,
                full_name=agency.name,
                role="agency_admin",
                status="active",
                agency_id=str(agency.id),
            )

        # 2. Check if subject matches a license ID
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if lic:
            return UserOut(
                id=str(lic.id),
                email=lic.email or "",
                username=lic.recruiter_name or "",
                full_name=lic.recruiter_name or "",
                role=lic.role or "agency_admin",
                status="active",
                agency_id=str(lic.agency_id) if lic.agency_id else None,
            )

        # Fallback to first agency
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        return UserOut(
            id=str(agency.id),
            email=agency.email,
            username=agency.name,
            full_name=agency.name,
            role="agency_admin",
            status="active",
            agency_id=str(agency.id),
        )
    except Exception:
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        return UserOut(
            id=str(agency.id),
            email=agency.email,
            username=agency.name,
            full_name=agency.name,
            role="agency_admin",
            status="active",
            agency_id=str(agency.id),
        )


@router.get("/agency/users", response_model=List[AgencyUserOut])
async def get_agency_users(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    profiles = []
    
    stmt = select(LicenseORM).where(LicenseORM.agency_id == str(agency.id))
    result = await uow.session.execute(stmt)
    lics = result.scalars().all()
    
    for l in lics:
        profiles.append(
            AgencyUserOut(
                id=str(l.id),
                username=l.recruiter_name or "",
                email=l.email or "",
                role=l.role or "agency_admin",
                has_password=bool(l.admin_password),
            )
        )
    return profiles


@router.post("/agency/users", response_model=AgencyUserOut)
async def create_agency_user(
    payload: CreateAgencyUserRequest,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select

    # Check if license with same email exists
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.email == payload.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
        
    license_id = str(uuid.uuid4())
    license_key = f"DL-{str(uuid.uuid4())[:8].upper()}"

    new_lic = LicenseORM(
        id=license_id,
        key=license_key,
        agency_id=str(agency.id),
        recruiter_name=payload.username,
        email=payload.email,
        admin_password=payload.password,
        role=payload.role or "agency_admin",
    )
    uow.session.add(new_lic)
    await uow.session.flush()
    await uow.session.commit()
    
    return AgencyUserOut(
        id=license_id,
        username=payload.username,
        email=payload.email,
        role=payload.role or "agency_admin",
        has_password=True,
    )


@router.post("/users/select", response_model=TokenResponse)
async def select_profile(
    payload: SelectProfileRequest,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select

    # 1. Check if user_id is the agency itself
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == payload.user_id))
    agency = res.scalar_one_or_none()
    if agency:
        # Generate token for the superuser/agency profile
        access_token = create_access_token(
            subject=str(agency.id),
            role="agency_admin",
            agency_id=str(agency.id),
            extra={"user_type": "agency", "role": "agency_admin"},
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=access_token,
            role="agency_admin",
            user_id=str(agency.id),
            agency_id=str(agency.id),
        )

    # 2. Check if user_id is a profile from License
    res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == payload.user_id))
    lic = res_lic.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user_role = lic.role or "agency_admin"

    # Create tokens
    access_token = create_access_token(
        subject=str(lic.id),
        role=user_role,
        agency_id=str(lic.agency_id) if lic.agency_id else str(lic.id),
        extra={"user_type": "agency", "role": user_role},
    )
    refresh_token = access_token

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user_role,
        user_id=str(lic.id),
        agency_id=str(lic.agency_id) if lic.agency_id else str(lic.id),
    )


@router.post("/register")
async def register(
    payload: RegisterRequest,
    uow: Any = Depends(get_uow),
):
    import uuid
    license_id = str(uuid.uuid4())
    license_key = f"DL-{str(uuid.uuid4())[:8].upper()}"

    new_lic = LicenseORM(
        id=license_id,
        key=license_key,
        agency_id=payload.agency_id or str(uuid.uuid4()),
        recruiter_name=payload.username,
        email=payload.email,
        admin_password=payload.password,
        role=payload.role or "agency_admin",
    )
    uow.session.add(new_lic)
    await uow.session.flush()
    await uow.session.commit()
    
    return {"user_id": license_id, "status": "ok"}
