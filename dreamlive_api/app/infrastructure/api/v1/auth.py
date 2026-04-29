"""
Rutas de autenticación — Controladores "tontos".

Responsabilidad ÚNICA: recibir request HTTP → delegar al Use Case → devolver response.
Sin lógica de negocio, sin instanciación de repos, sin try/except.
El Exception Handler global de DomainException se encarga de los errores.
"""
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

from app.core.domain.exceptions import UnauthorizedAccess
from app.infrastructure.api.deps import get_current_agency
from app.infrastructure.api.schemas import TokenResponse
from app.infrastructure.api.providers import (
    get_login_use_case,
    get_select_profile_use_case,
    get_create_user_use_case,
    get_refresh_token_use_case,
    get_profile_use_case,
    get_list_agency_users_use_case,
)
from app.application.auth.use_cases import (
    LoginInput, LoginUseCase,
    SelectProfileInput, SelectProfileUseCase,
    CreateUserInput, CreateUserUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
    ListAgencyUsersUseCase,
)
from app.core.entities.agency import Agency


router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ── Schemas Pydantic ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None


class SelectProfileRequest(BaseModel):
    user_id: str
    password: str | None = None


class CreateProfileRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "agency_admin"


class UserOut(BaseModel):
    """Respuesta de /me – campos que el frontend espera en el objeto User."""
    id: str | None
    email: str | None
    username: str
    full_name: str
    role: str
    status: str
    agency_id: str | None
    logo_url: str | None = None

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


@router.get("/agency/users")
async def get_agency_users(
    agency: Agency = Depends(get_current_agency),
    use_case: ListAgencyUsersUseCase = Depends(get_list_agency_users_use_case),
):
    """Paso 2: Retorna los perfiles (usuarios) vinculados a la agencia autenticada."""
    users = await use_case.execute(agency_id=str(agency.id))
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role.value,
            "has_password": bool(u.password_hash),
        }
        for u in users
    ]


@router.post("/agency/users", status_code=201)
async def create_agency_user(
    payload: CreateProfileRequest,
    agency: Agency = Depends(get_current_agency),
    use_case: CreateUserUseCase = Depends(get_create_user_use_case),
):
    """Paso 2 Opcional: Crear un nuevo perfil en la agencia."""
    result = await use_case.execute(
        CreateUserInput(
            email=payload.email,
            username=payload.username,
            password=payload.password,
            role=payload.role,
            agency_id=str(agency.id),
        )
    )
    return {
        "id": result.user.id,
        "username": result.user.username,
        "email": result.user.email,
        "role": result.user.role.value,
        "has_password": True,
    }


@router.post("/users/select", response_model=TokenResponse)
async def select_user(
    payload: SelectProfileRequest,
    use_case: SelectProfileUseCase = Depends(get_select_profile_use_case),
):
    """Paso 3: Validar el perfil seleccionado y retornar el token de usuario final."""
    result = await use_case.execute(
        SelectProfileInput(
            user_id=payload.user_id,
            password=payload.password,
        )
    )
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        role=result.user.role.value,
        user_id=str(result.user.id),
        agency_id=result.user.agency_id,
    )


@router.post("/register", status_code=501)
async def register():
    """No implementado - Creación manual en Supabase por ahora."""
    from fastapi import HTTPException, status
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


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
        id=profile.id,
        email=profile.email,
        username=profile.username,
        full_name=profile.full_name,
        role=profile.role,
        status=profile.status,
        agency_id=profile.agency_id,
        logo_url=profile.logo_url,
    )
