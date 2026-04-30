from enum import Enum
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.adapters.db.session import get_db
from app.core.ports.unit_of_work import IUnitOfWork
from app.adapters.db.supabase_uow import SupabaseUnitOfWork
from app.core.ports.security import ITokenService
from app.adapters.db.repositories.agency_repository import AgencyRepository
from app.adapters.db.repositories.license_repository import LicenseRepository

bearer_scheme = HTTPBearer()

class UserRole(str, Enum):
    SUPERUSER = "superuser"
    AGENCY_ADMIN = "agency_admin"
    AGENT = "agent"

@dataclass
class AuthUser:
    id: str
    email: str
    username: str
    role: UserRole
    agency_id: str | None = None
    license_id: str | None = None

def _get_token_service() -> ITokenService:
    """Obtiene el singleton del servicio de tokens."""
    from app.infrastructure.api.providers import get_token_service
    return get_token_service()

def _decode_token_or_401(credentials: HTTPAuthorizationCredentials) -> dict:
    if not credentials or not getattr(credentials, "credentials", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        token_service = _get_token_service()
        return token_service.decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_uow(db: Client = Depends(get_db)) -> IUnitOfWork:
    """Provee una instancia gestionada del Unit of Work por cada request."""
    async with SupabaseUnitOfWork(db) as uow:
        yield uow

async def get_current_agency(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Client = Depends(get_db),
):
    payload = _decode_token_or_401(credentials)

    if payload.get("type") != "access" or payload.get("user_type") != "agency":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere token de sesión de agencia.",
        )

    agency_id = str(payload["sub"])
    repo = AgencyRepository(db)
    agency = await repo.get_by_id(agency_id)

    if not agency:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agencia no encontrada.",
        )

    return agency

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Client = Depends(get_db),
) -> AuthUser:
    """Decodifica el JWT y retorna AuthUser (Agency o License) según el token."""
    payload = _decode_token_or_401(credentials)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere token de acceso.",
        )

    user_type = payload.get("user_type", "agency")
    raw_role = payload.get("role", "agent" if user_type == "license" else "agency_admin")

    if raw_role == "owner":
        raw_role = "agency_admin"

    try:
        user_role = UserRole(raw_role)
    except ValueError:
        user_role = UserRole.AGENT

    if user_type == "agency":
        agency_id = str(payload["sub"])
        repo = AgencyRepository(db)
        agency = await repo.get_by_id(agency_id)

        if not agency:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Agencia no encontrada.",
            )

        return AuthUser(
            id=agency.id or "",
            email=agency.email or "",
            username=agency.name,
            role=user_role,
            agency_id=agency.id,
        )

    elif user_type in ["license", "user"]:
        license_id = str(payload["sub"])
        repo = LicenseRepository(db)
        lic = await repo.get_by_id(license_id)
        if not lic:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Licencia no encontrada.",
            )

        return AuthUser(
            id=lic.id or "",
            email=lic.email or "",
            username=lic.full_name or lic.recruiter_name,
            role=user_role,
            agency_id=lic.agency_id,
            license_id=lic.id,
        )

def require_roles(*roles: UserRole):
    """
    Dependencia de fábrica que verifica que el usuario tenga
    al menos uno de los roles especificados.
    """
    async def _check(
        current_user: AuthUser = Depends(get_current_user),
    ) -> AuthUser:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acceso denegado. Se requiere uno de: "
                    f"{[r.value for r in roles]}"
                ),
            )
        return current_user
    return _check

# Atajos semánticos
require_admin = require_roles(UserRole.SUPERUSER)
require_agency_group = require_roles(UserRole.SUPERUSER, UserRole.AGENCY_ADMIN, UserRole.AGENT)
require_owner_or_admin = require_roles(UserRole.SUPERUSER, UserRole.AGENCY_ADMIN)
