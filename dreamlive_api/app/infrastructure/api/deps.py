"""
Dependencias de FastAPI para autenticación y autorización.

Usa ITokenService (puerto) para decodificar tokens, no el adaptador directamente.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.adapters.db.session import get_db
from app.core.ports.unit_of_work import IUnitOfWork
from app.adapters.db.supabase_uow import SupabaseUnitOfWork
from app.core.ports.security import ITokenService
from app.core.entities.user import User, UserRole, UserStatus

bearer_scheme = HTTPBearer()


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
    """Provee una instancia compartida del Unit of Work por request."""
    return SupabaseUnitOfWork(db)


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
) -> User:
    """Decodifica el JWT y retorna un usuario (agency/user) según el token."""
    payload = _decode_token_or_401(credentials)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere token de acceso.",
        )

    user_type = payload.get("user_type", "agency")
    raw_role = payload.get("role", "agent" if user_type == "user" else "agency_admin")

    # Normalización de roles antiguos (owner -> agency_admin)
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
                detail="Usuario (Agencia) no encontrado.",
            )

        return User(
            id=agency.id,
            email=agency.email or "",
            username=agency.name,
            role=user_role,
            agency_id=agency.id,
            status=UserStatus.ACTIVE,
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(str(payload["sub"]))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
        )

    return User(
        id=user.id,
        email=user.email or "",
        username=user.username,
        role=user_role,  # Usamos el rol normalizado
        agency_id=user.agency_id,
        status=user.status,
    )


def require_roles(*roles: UserRole):
    """
    Dependencia de fábrica que verifica que el usuario tenga
    al menos uno de los roles especificados.
    """
    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
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
