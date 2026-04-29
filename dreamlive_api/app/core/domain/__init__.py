"""
Paquete de dominio: excepciones y reglas de negocio compartidas.
"""
from app.core.domain.exceptions import (
    DomainException,
    EntityNotFound,
    EntityAlreadyExists,
    ValidationError,
    UnauthorizedAccess,
    ForbiddenAction,
    LicenseNotFound,
    LicenseExpired,
    LicenseInactive,
    DeviceLimitExceeded,
    UserNotFound,
    AgencyNotFound,
    InvalidCredentials,
)

__all__ = [
    "DomainException",
    "EntityNotFound",
    "EntityAlreadyExists",
    "ValidationError",
    "UnauthorizedAccess",
    "ForbiddenAction",
    "LicenseNotFound",
    "LicenseExpired",
    "LicenseInactive",
    "DeviceLimitExceeded",
    "UserNotFound",
    "AgencyNotFound",
    "InvalidCredentials",
]
