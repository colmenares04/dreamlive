"""
Rutas de autenticación adaptadas para esquema Supabase (Agencias como usuarias).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import AgencyRepository, UserRepository
from app.application.auth.use_cases import (
    LoginInput, LoginUseCase,
    SelectProfileInput, SelectProfileUseCase,
    CreateUserInput, CreateUserUseCase
)
from app.infrastructure.api.deps import get_current_agency
from app.infrastructure.api.schemas import TokenResponse
from app.core.entities.models import Agency
from app.adapters.security.handlers import JWTHandler


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
async def login(payload: LoginRequest, db: Client = Depends(get_db)):
    """Paso 1: Autenticación de Agencia. Retorna un agency_session token."""
    repo = AgencyRepository(db)
    use_case = LoginUseCase(repo)
    try:
        result = await use_case.execute(
            LoginInput(
                email=payload.email,
                password=payload.password,
                captcha_token=payload.captcha_token,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

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
    db: Client = Depends(get_db),
):
    """Paso 2: Retorna los perfiles (usuarios) vinculados a la agencia autenticada."""
    repo = UserRepository(db)
    users = await repo.list_all(agency_id=str(agency.id))
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role.value,
            "has_password": bool(u.password_hash)
        }
        for u in users
    ]

@router.post("/agency/users", status_code=status.HTTP_201_CREATED)
async def create_agency_user(
    payload: CreateProfileRequest,
    agency: Agency = Depends(get_current_agency),
    db: Client = Depends(get_db),
):
    """Paso 2 Opcional: Crear un nuevo perfil en la agencia (Ej: cuando no hay perfiles)."""
    repo = UserRepository(db)
    use_case = CreateUserUseCase(repo)
    try:
        result = await use_case.execute(
            CreateUserInput(
                email=payload.email,
                username=payload.username,
                password=payload.password,
                role=payload.role,
                agency_id=str(agency.id),
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    
    return {
        "id": result.user.id,
        "username": result.user.username,
        "email": result.user.email,
        "role": result.user.role.value,
        "has_password": True
    }

@router.post("/users/select", response_model=TokenResponse)
async def select_user(payload: SelectProfileRequest, db: Client = Depends(get_db)):
    """Paso 3: Validar el perfil seleccionado y retornar el token de usuario final."""
    repo = UserRepository(db)
    use_case = SelectProfileUseCase(repo)
    try:
        result = await use_case.execute(
            SelectProfileInput(
                user_id=payload.user_id,
                password=payload.password,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        role=result.user.role.value,
        user_id=str(result.user.id),
        agency_id=result.user.agency_id,
    )


@router.post("/register", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def register():
    """No implementado - Creación manual en Supabase por ahora."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Client = Depends(get_db),
):
    """Refresca un access token usando un refresh token válido.
    El refresh token debe ser del tipo `refresh` y contener claims mínimos
    (`user_type`, `role`, `agency_id`) que se pusieron al crear el token.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token no proporcionado.")

    try:
        payload = JWTHandler.decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado.")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Se requiere refresh token.")

    user_type = payload.get("user_type", "agency")
    subject = str(payload["sub"])
    role = payload.get("role")
    agency_id = payload.get("agency_id")

    # Regenerar tokens según el tipo de sujeto
    if user_type == "agency":
        repo = AgencyRepository(db)
        agency = await repo.get_by_id(subject)
        if not agency:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agencia no encontrada.")

        access_token = JWTHandler.create_access_token(
            subject=subject,
            role=role or "agency_session",
            agency_id=agency.id,
            extra={"user_type": "agency"},
        )
        refresh = JWTHandler.create_refresh_token(
            subject=subject,
            role=role or "agency_session",
            user_type="agency",
            agency_id=agency.id,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh,
            role="agency_session",
            user_id=str(agency.id),
            agency_id=str(agency.id),
        )

    # user
    repo = UserRepository(db)
    user = await repo.get_by_id(subject)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado.")

    access_token = JWTHandler.create_access_token(
        subject=subject,
        role=role or user.role.value,
        agency_id=user.agency_id,
        extra={"user_type": "user"},
    )
    refresh = JWTHandler.create_refresh_token(
        subject=subject,
        role=role or user.role.value,
        user_type="user",
        agency_id=user.agency_id,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh,
        role=user.role.value,
        user_id=str(user.id),
        agency_id=user.agency_id,
    )


@router.post("/password-reset/request", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def request_password_reset():
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.post("/password-reset/confirm", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def confirm_password_reset():
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/me", response_model=UserOut)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Client = Depends(get_db),
):
    """Decodifica el JWT y retorna los datos del usuario autenticado."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token no proporcionado.")

    try:
        payload = JWTHandler.decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado.")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Se requiere token de acceso.")

    user_type = payload.get("user_type", "agency")
    if user_type == "agency":
        agency_id = str(payload["sub"])
        repo = AgencyRepository(db)
        agency = await repo.get_by_id(agency_id)

        if not agency:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agencia no encontrada.")

        return UserOut(
            id=agency.id,
            email=agency.email,
            username=agency.name,
            full_name=agency.name,
            role="agency_admin",
            status="active",
            agency_id=agency.id,
            logo_url=agency.logo_url,
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(str(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado.")

    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.username,
        role=user.role.value,
        status=user.status.value,
        agency_id=user.agency_id,
        logo_url=None,
    )

