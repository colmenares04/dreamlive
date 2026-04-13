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
    LoginUseCase, LoginInput,
    UserLoginUseCase, UserLoginInput,
)
from app.adapters.security.handlers import JWTHandler


router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=False)

# ── Schemas Pydantic ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    agency_id: str | None


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
        role="owner",
        user_id=str(result.agency.id),
        agency_id=str(result.agency.id),
    )


@router.post("/users/login", response_model=TokenResponse)
async def login_user(payload: LoginRequest, db: Client = Depends(get_db)):
    repo = UserRepository(db)
    use_case = UserLoginUseCase(repo)
    try:
        result = await use_case.execute(
            UserLoginInput(
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
        role=result.user.role.value,
        user_id=str(result.user.id),
        agency_id=result.user.agency_id,
    )


@router.post("/register", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def register():
    """No implementado - Creación manual en Supabase por ahora."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


@router.post("/refresh", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def refresh_token():
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


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
            role="owner",
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

