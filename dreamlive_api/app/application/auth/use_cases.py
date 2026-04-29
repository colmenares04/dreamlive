"""
Casos de uso de autenticación.

Reglas:
  - CERO imports de app.adapters (Dependency Rule).
  - Dependencias inyectadas via constructor (puertos del Core).
  - Excepciones de dominio tipadas (no ValueError).
"""
from typing import Optional, List

from app.core.entities.agency import Agency
from app.core.entities.user import User, UserRole, UserStatus
from app.core.ports.unit_of_work import IUnitOfWork
from app.core.ports.security import ITokenService, IPasswordHasher
from app.core.domain.exceptions import (
    InvalidCredentials,
    UserNotFound,
    AgencyNotFound,
    EntityAlreadyExists,
    UnauthorizedAccess,
    ValidationError,
)


# ═══════════════════════════════════════════════════════════════════════════════
# DTOs de entrada/salida
# ═══════════════════════════════════════════════════════════════════════════════
class LoginInput:
    def __init__(self, email: str, password: str, captcha_token: Optional[str] = None):
        self.email = email
        self.password = password
        self.captcha_token = captcha_token


class LoginOutput:
    def __init__(self, access_token: str, refresh_token: str, agency: Agency):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.agency = agency


class SelectProfileInput:
    def __init__(self, user_id: str, password: Optional[str] = None):
        self.user_id = user_id
        self.password = password


class SelectProfileOutput:
    def __init__(self, access_token: str, refresh_token: str, user: User):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.user = user


class CreateUserInput:
    def __init__(
        self,
        email: str,
        username: str,
        password: str,
        role: str,
        full_name: str | None = None,
        agency_id: str | None = None,
    ):
        self.email = email
        self.username = username
        self.password = password
        self.role = role
        self.full_name = full_name or username
        self.agency_id = agency_id


class CreateUserOutput:
    def __init__(self, user: User):
        self.user = user


class RefreshTokenOutput:
    def __init__(self, access_token: str, refresh_token: str, role: str, user_id: str, agency_id: str | None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.role = role
        self.user_id = user_id
        self.agency_id = agency_id


class ProfileOutput:
    def __init__(
        self,
        id: str | None,
        email: str | None,
        username: str,
        full_name: str,
        role: str,
        status: str,
        agency_id: str | None,
        logo_url: str | None = None,
    ):
        self.id = id
        self.email = email
        self.username = username
        self.full_name = full_name
        self.role = role
        self.status = status
        self.agency_id = agency_id
        self.logo_url = logo_url


# ═══════════════════════════════════════════════════════════════════════════════
# USE CASES
# ═══════════════════════════════════════════════════════════════════════════════
class LoginUseCase:
    """Paso 1: Autentica una agencia por email/password."""

    def __init__(
        self,
        uow: IUnitOfWork,
        token_service: ITokenService,
    ) -> None:
        self._uow = uow
        self._token_service = token_service

    async def execute(self, data: LoginInput) -> LoginOutput:
        agency = await self._uow.agencies.get_by_email(data.email)
        if not agency:
            raise InvalidCredentials()

        if agency.password != data.password:
            raise InvalidCredentials()

        access_token = self._token_service.create_access_token(
            subject=str(agency.id),
            role="agency_session",
            agency_id=str(agency.id),
            extra={"user_type": "agency"},
        )
        refresh_token = self._token_service.create_refresh_token(
            subject=str(agency.id),
            role="agency_session",
            user_type="agency",
            agency_id=str(agency.id),
        )

        return LoginOutput(
            access_token=access_token,
            refresh_token=refresh_token,
            agency=agency,
        )


class SelectProfileUseCase:
    """Paso 3: Valida el perfil seleccionado y genera tokens de usuario."""

    def __init__(
        self,
        uow: IUnitOfWork,
        token_service: ITokenService,
        password_hasher: IPasswordHasher,
    ) -> None:
        self._uow = uow
        self._token_service = token_service
        self._password_hasher = password_hasher

    async def execute(self, data: SelectProfileInput) -> SelectProfileOutput:
        user = await self._uow.users.get_by_id(data.user_id)
        if not user:
            raise UserNotFound()

        if user.password_hash:
            if not data.password:
                raise InvalidCredentials("Este perfil requiere contraseña.")
            if not self._password_hasher.verify(data.password, user.password_hash):
                raise InvalidCredentials("Contraseña de perfil incorrecta.")

        access_token = self._token_service.create_access_token(
            subject=str(user.id),
            role=user.role.value,
            agency_id=user.agency_id,
            extra={"user_type": "user"},
        )
        refresh_token = self._token_service.create_refresh_token(
            subject=str(user.id),
            role=user.role.value,
            user_type="user",
            agency_id=user.agency_id,
        )

        return SelectProfileOutput(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )


class CreateUserUseCase:
    """Crea un nuevo usuario con contraseña hasheada."""

    def __init__(
        self,
        uow: IUnitOfWork,
        password_hasher: IPasswordHasher,
    ) -> None:
        self._uow = uow
        self._password_hasher = password_hasher

    async def execute(self, data: CreateUserInput) -> CreateUserOutput:
        existing = await self._uow.users.get_by_email(data.email)
        if existing:
            raise EntityAlreadyExists("Email ya registrado.")

        hashed_password = self._password_hasher.hash(data.password)
        user = User(
            id=None,
            email=data.email,
            username=data.full_name or data.username,
            role=UserRole(data.role),
            agency_id=data.agency_id,
            password_hash=hashed_password,
            status=UserStatus.ACTIVE,
        )
        async with self._uow:
            created = await self._uow.users.create(user)
            await self._uow.commit()
        return CreateUserOutput(created)


class RefreshTokenUseCase:
    """Refresca un access token usando un refresh token válido."""

    def __init__(
        self,
        uow: IUnitOfWork,
        token_service: ITokenService,
    ) -> None:
        self._uow = uow
        self._token_service = token_service

    async def execute(self, raw_token: str) -> RefreshTokenOutput:
        payload = self._token_service.decode_token(raw_token)

        if payload.get("type") != "refresh":
            raise UnauthorizedAccess("Se requiere refresh token.")

        user_type = payload.get("user_type", "agency")
        subject = str(payload["sub"])
        role = payload.get("role")
        agency_id = payload.get("agency_id")

        if user_type == "agency":
            agency = await self._uow.agencies.get_by_id(subject)
            if not agency:
                raise AgencyNotFound()

            access_token = self._token_service.create_access_token(
                subject=subject,
                role=role or "agency_session",
                agency_id=agency.id,
                extra={"user_type": "agency"},
            )
            refresh = self._token_service.create_refresh_token(
                subject=subject,
                role=role or "agency_session",
                user_type="agency",
                agency_id=agency.id,
            )
            return RefreshTokenOutput(
                access_token=access_token,
                refresh_token=refresh,
                role="agency_session",
                user_id=str(agency.id),
                agency_id=str(agency.id),
            )

        # user
        user = await self._uow.users.get_by_id(subject)
        if not user:
            raise UserNotFound()

        access_token = self._token_service.create_access_token(
            subject=subject,
            role=role or user.role.value,
            agency_id=user.agency_id,
            extra={"user_type": "user"},
        )
        refresh = self._token_service.create_refresh_token(
            subject=subject,
            role=role or user.role.value,
            user_type="user",
            agency_id=user.agency_id,
        )
        return RefreshTokenOutput(
            access_token=access_token,
            refresh_token=refresh,
            role=user.role.value,
            user_id=str(user.id),
            agency_id=user.agency_id,
        )


class GetProfileUseCase:
    """Retorna el perfil del usuario autenticado a partir de su token."""

    def __init__(
        self,
        uow: IUnitOfWork,
        token_service: ITokenService,
    ) -> None:
        self._uow = uow
        self._token_service = token_service

    async def execute(self, raw_token: str) -> ProfileOutput:
        payload = self._token_service.decode_token(raw_token)

        if payload.get("type") != "access":
            raise UnauthorizedAccess("Se requiere token de acceso.")

        user_type = payload.get("user_type", "agency")

        if user_type == "agency":
            agency_id = str(payload["sub"])
            agency = await self._uow.agencies.get_by_id(agency_id)
            if not agency:
                raise AgencyNotFound()

            return ProfileOutput(
                id=agency.id,
                email=agency.email,
                username=agency.name,
                full_name=agency.name,
                role="agency_admin",
                status="active",
                agency_id=agency.id,
                logo_url=agency.logo_url,
            )

        user = await self._uow.users.get_by_id(str(payload["sub"]))
        if not user:
            raise UserNotFound()

        return ProfileOutput(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.username,
            role=user.role.value,
            status=user.status.value,
            agency_id=user.agency_id,
        )


class ListAgencyUsersUseCase:
    """Lista los usuarios/perfiles vinculados a una agencia."""

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    async def execute(self, agency_id: str) -> List[User]:
        return await self._uow.users.list_all(agency_id=agency_id)
