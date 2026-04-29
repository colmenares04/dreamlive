"""
Excepciones de dominio centralizadas.

Estas excepciones representan reglas de negocio rotas o estados inválidos
del dominio. Son traducidas a respuestas HTTP por el manejador de excepciones
en la capa de infraestructura (RFC 7807 Problem Details).
"""


class DomainException(Exception):
    """Excepción base para todas las excepciones de dominio."""

    default_message: str = "Ha ocurrido un error en el dominio."
    status_code: int = 400

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEPCIONES GENÉRICAS
# ═══════════════════════════════════════════════════════════════════════════════

class EntityNotFound(DomainException):
    """La entidad solicitada no existe en el sistema."""
    status_code = 404
    default_message = "Entidad no encontrada."


class EntityAlreadyExists(DomainException):
    """Se intenta crear una entidad que ya existe (e.g. email duplicado)."""
    status_code = 409
    default_message = "La entidad ya existe."


class ValidationError(DomainException):
    """Los datos proporcionados no superan las reglas de validación del dominio."""
    status_code = 422
    default_message = "Error de validación."


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEPCIONES DE AUTENTICACIÓN / AUTORIZACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

class UnauthorizedAccess(DomainException):
    """El actor no está autenticado o el token es inválido."""
    status_code = 401
    default_message = "Acceso no autorizado."


class ForbiddenAction(DomainException):
    """El actor autenticado no tiene permisos suficientes para esta acción."""
    status_code = 403
    default_message = "Acción no permitida."


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEPCIONES DE LICENCIA
# ═══════════════════════════════════════════════════════════════════════════════

class LicenseNotFound(EntityNotFound):
    """La licencia especificada no existe."""
    default_message = "Licencia no encontrada."


class LicenseExpired(DomainException):
    """La licencia ha vencido y ya no es válida para el acceso."""
    status_code = 403
    default_message = "La licencia ha expirado."


class LicenseInactive(DomainException):
    """La licencia existe pero está desactivada."""
    status_code = 403
    default_message = "La licencia está inactiva."


class DeviceLimitExceeded(DomainException):
    """Se ha alcanzado el límite máximo de dispositivos para la licencia."""
    status_code = 403
    default_message = "Se ha alcanzado el límite de dispositivos para esta licencia."


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEPCIONES DE USUARIO / AGENCIA
# ═══════════════════════════════════════════════════════════════════════════════

class UserNotFound(EntityNotFound):
    """El usuario especificado no existe."""
    default_message = "Usuario no encontrado."


class AgencyNotFound(EntityNotFound):
    """La agencia especificada no existe."""
    default_message = "Agencia no encontrada."


class InvalidCredentials(DomainException):
    """Las credenciales de autenticación son incorrectas."""
    status_code = 401
    default_message = "Credenciales inválidas."
