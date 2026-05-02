"""
Rutas de autenticación — Controladores "tontos".

Responsabilidad ÚNICA: recibir request HTTP → delegar al Use Case → devolver response.
Sin lógica de negocio, sin instanciación de repos, sin try/except.
El Exception Handler global de DomainException se encarga de los errores.
"""
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Any, Dict, List, Optional

from app.core.domain.exceptions import UnauthorizedAccess
from app.infrastructure.api.deps import get_current_agency, AuthUser
from app.core.ports.security import ITokenService
from app.infrastructure.api.schemas import TokenResponse
from app.infrastructure.api.providers import (
    get_login_use_case,
    get_refresh_token_use_case,
    get_profile_use_case,
    get_verify_license_use_case,
    get_register_session_use_case,
    get_link_license_use_case,
    get_login_extension_use_case,
    get_token_service,
)
from app.application.auth.use_cases import (
    LoginInput, LoginUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
)
from app.application.licenses.use_cases import (
    VerifyLicenseUseCase,
    RegisterSessionUseCase,
    LinkLicenseUseCase,
    LoginExtensionUseCase,
)
from app.core.entities.agency import Agency


router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ── Schemas Pydantic ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None

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


class UserOut(BaseModel):
    """Respuesta de /me – campos que el frontend espera en el objeto User."""
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

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    use_case: LoginUseCase = Depends(get_login_use_case),
):
    """Paso 1: Autenticación de Agencia. Retorna un agency_session token."""
    result = await use_case.execute(
        LoginInput(
            email=payload.email,
            password=payload.password,
            captcha_token=payload.captcha_token,
        )
    )
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        role="agency_session",
        user_id=str(result.agency.id),
        agency_id=str(result.agency.id),
    )





@router.post("/login-license", response_model=LoginLicenseResponse)
async def login_license(
    payload: LoginLicenseRequest,
    verify_use_case: VerifyLicenseUseCase = Depends(get_verify_license_use_case),
    register_session_use_case: RegisterSessionUseCase = Depends(get_register_session_use_case),
    token_service: ITokenService = Depends(get_token_service),
):
    """Autenticación por llave de licencia (SSO para Agentes)."""
    # 1. Verificar licencia
    lic = await verify_use_case.execute(payload.licenseKey)
    if not lic:
        raise UnauthorizedAccess("Licencia inválida o expirada.")

    # 2. Registrar sesión y manejar límite de dispositivos
    session_id = await register_session_use_case.execute(
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser_name=payload.browser,
        os_name=payload.os
    )

    # 3. Crear token JWT real para la licencia
    access_token = token_service.create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    # 4. Preparar respuesta
    return LoginLicenseResponse(
        license={
            "id": str(lic.id),
            "key": lic.license_key,
            "status": "active"
        },
        hasAdminUser=bool(lic.email),
        token=access_token,
        session_id=session_id
    )


@router.post("/link-license", response_model=LoginLicenseResponse)
async def link_license(
    payload: LinkLicenseRequest,
    link_use_case: LinkLicenseUseCase = Depends(get_link_license_use_case),
    register_session_use_case: RegisterSessionUseCase = Depends(get_register_session_use_case),
    token_service: ITokenService = Depends(get_token_service),
):
    """Vincula un nuevo email a una licencia vacía."""
    lic = await link_use_case.execute(
        license_key=payload.licenseKey,
        email=payload.email,
        password=payload.password,
        full_name=payload.fullName
    )
    
    session_id = await register_session_use_case.execute(
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser_name=payload.browser,
        os_name=payload.os
    )

    # Crear token JWT real para la licencia vinculada
    access_token = token_service.create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={
            "id": str(lic.id),
            "key": lic.license_key,
            "status": "active"
        },
        hasAdminUser=True,
        token=access_token,
        session_id=session_id
    )


@router.post("/login-extension", response_model=LoginLicenseResponse)
async def login_extension(
    payload: LoginExtensionRequest,
    login_use_case: LoginExtensionUseCase = Depends(get_login_extension_use_case),
    register_session_use_case: RegisterSessionUseCase = Depends(get_register_session_use_case),
    token_service: ITokenService = Depends(get_token_service),
):
    """Autentica a un agente usando email/password y retorna su licencia."""
    lic = await login_use_case.execute(
        email=payload.email,
        password=payload.password
    )
    
    session_id = await register_session_use_case.execute(
        license_id=str(lic.id),
        device_id=payload.device_id,
        browser_name=payload.browser,
        os_name=payload.os
    )

    # Crear token JWT real para la licencia autenticada
    access_token = token_service.create_access_token(
        subject=str(lic.id),
        role="agent",
        agency_id=str(lic.agency_id),
        extra={"user_type": "license"}
    )

    return LoginLicenseResponse(
        license={
            "id": str(lic.id),
            "key": lic.license_key,
            "status": "active"
        },
        hasAdminUser=True,
        token=access_token,
        session_id=session_id
    )



@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    use_case: RefreshTokenUseCase = Depends(get_refresh_token_use_case),
):
    """Refresca un access token usando un refresh token válido."""
    if not credentials:
        raise UnauthorizedAccess("Refresh token no proporcionado.")

    result = await use_case.execute(credentials.credentials)

    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        role=result.role,
        user_id=result.user_id,
        agency_id=result.agency_id,
    )


@router.post("/password-reset/request", status_code=501)
async def request_password_reset():
    from fastapi import HTTPException, status
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.post("/password-reset/confirm", status_code=501)
async def confirm_password_reset():
    from fastapi import HTTPException, status
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/me", response_model=UserOut)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    use_case: GetProfileUseCase = Depends(get_profile_use_case),
):
    """Decodifica el JWT y retorna los datos del usuario autenticado."""
    if not credentials:
        raise UnauthorizedAccess("Token no proporcionado.")

    profile = await use_case.execute(credentials.credentials)

    return UserOut(
        id=str(profile.id) if profile.id else None,
        email=profile.email or "",
        username=profile.username,
        full_name=profile.full_name,
        role=profile.role,
        status=profile.status,
        agency_id=str(profile.agency_id) if profile.agency_id else None,
        license_id=getattr(profile, "license_id", None),
        logo_url=getattr(profile, "logo_url", None),
        limite_diario=getattr(profile, "limite_diario", 60),
        usados_hoy=getattr(profile, "usados_hoy", 0),
        tiempo_para_reinicio=getattr(profile, "tiempo_para_reinicio", 0),
    )
