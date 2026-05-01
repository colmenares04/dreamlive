from enum import Enum
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.db.session import async_session, get_db
from app.core.ports.unit_of_work import IUnitOfWork
from app.adapters.db.sqlalchemy_uow import SqlAlchemyUnitOfWork
from app.core.ports.security import ITokenService
from app.core.entities.user import UserRole, UserStatus


bearer_scheme = HTTPBearer()


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


async def get_uow() -> IUnitOfWork:
    """Provee una instancia gestionada del Unit of Work por cada request."""
    async with SqlAlchemyUnitOfWork(async_session) as uow:
        yield uow


async def get_current_agency(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: IUnitOfWork = Depends(get_uow),
):
    payload = _decode_token_or_401(credentials)

    if payload.get("type") != "access" or payload.get("user_type") != "agency":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere token de sesión de agencia.",
        )

    agency_id = str(payload["sub"])
    agency = await uow.agencies.get_by_id(agency_id)

    if not agency:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agencia no encontrada.",
        )

    return agency


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: IUnitOfWork = Depends(get_uow),
) -> AuthUser:
    """Decodifica el JWT y retorna AuthUser según el token."""
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
        agency = await uow.agencies.get_by_id(agency_id)

        if not agency:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Agencia no encontrada.",
            )

        return AuthUser(
            id=str(agency.id or ""),
            email=agency.email if hasattr(agency, "email") else "",
            username=agency.name,
            role=user_role,
            agency_id=str(agency.id),
        )

    elif user_type in ["license", "user"]:
        license_id = str(payload["sub"])
        lic = await uow.licenses.get_by_id(license_id)
        if not lic:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Licencia no encontrada.",
            )

        return AuthUser(
            id=str(lic.id or ""),
            email=lic.email or "",
            username=lic.full_name or lic.recruiter_name,
            role=user_role,
            agency_id=str(lic.agency_id),
            license_id=str(lic.id),
        )

    else:
        # User auth from direct user table
        user_id = str(payload["sub"])
        user = await uow.users.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado.",
            )
        return AuthUser(
            id=str(user.id or ""),
            email=user.email,
            username=user.username,
            role=user.role,
            agency_id=str(user.agency_id) if user.agency_id else None,
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
