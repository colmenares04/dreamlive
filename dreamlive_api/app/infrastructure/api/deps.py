"""
Dependencias de FastAPI, refactorizadas para cliente sincrónico Supabase.
"""
from typing import Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import AgencyRepository, UserRepository
from app.adapters.security.handlers import JWTHandler
from app.core.entities.user import User, UserRole, UserStatus

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Client = Depends(get_db),
) -> User:
    """Decodifica el JWT y retorna un usuario mockeado basado en la Agencia."""
    token = credentials.credentials
    try:
        payload = JWTHandler.decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere token de acceso.",
        )

    user_type = payload.get("user_type", "agency")

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
            role=UserRole(payload.get("role", "owner")),
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
        role=user.role,
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
require_admin = require_roles(UserRole.ADMIN)
require_admin_or_programmer = require_roles(UserRole.ADMIN, UserRole.PROGRAMMER)
require_agency_group = require_roles(UserRole.ADMIN, UserRole.OWNER, UserRole.AGENT)
require_owner_or_admin = require_roles(UserRole.ADMIN, UserRole.OWNER)
