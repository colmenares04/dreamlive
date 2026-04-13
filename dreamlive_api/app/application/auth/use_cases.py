"""
Casos de uso de autenticación basados en la entidad Agency de Supabase.
  - LoginUseCase
  - VerifyCaptchaUseCase
"""
import httpx
from typing import Optional

from app.config import settings
from app.core.entities.models import Agency
from app.core.entities.user import User, UserRole, UserStatus
from app.core.ports.repositories import IAgencyRepository, IUserRepository
from app.adapters.security.handlers import JWTHandler, PasswordHandler


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


class UserLoginInput(LoginInput):
    pass


class UserLoginOutput:
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


class VerifyCaptchaUseCase:
    """Valida el token de reCAPTCHA v2 con la API de Google."""
    async def execute(self, token: str) -> bool:
        if not settings.RECAPTCHA_SECRET_KEY:
            return True
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                settings.RECAPTCHA_VERIFY_URL,
                data={"secret": settings.RECAPTCHA_SECRET_KEY, "response": token},
            )
            data = resp.json()
            return data.get("success", False)


class LoginUseCase:
    def __init__(self, agency_repo: IAgencyRepository):
        self._agency_repo = agency_repo

    async def execute(self, data: LoginInput) -> LoginOutput:
        if data.captcha_token:
            captcha_ok = await VerifyCaptchaUseCase().execute(data.captcha_token)
            if not captcha_ok:
                raise ValueError("Verificación de captcha fallida.")

        agency = await self._agency_repo.get_by_email(data.email)
        if not agency:
            raise ValueError("Credenciales incorrectas.")

        if agency.password != data.password:
            raise ValueError("Credenciales incorrectas.")

        access_token = JWTHandler.create_access_token(
            subject=str(agency.id),
            role="owner",
            agency_id=str(agency.id),
            extra={"user_type": "agency"},
        )
        refresh_token = JWTHandler.create_refresh_token(subject=str(agency.id))

        return LoginOutput(
            access_token=access_token,
            refresh_token=refresh_token,
            agency=agency,
        )


class UserLoginUseCase:
    def __init__(self, user_repo: IUserRepository):
        self._user_repo = user_repo

    async def execute(self, data: UserLoginInput) -> UserLoginOutput:
        if data.captcha_token:
            captcha_ok = await VerifyCaptchaUseCase().execute(data.captcha_token)
            if not captcha_ok:
                raise ValueError("Verificación de captcha fallida.")

        user = await self._user_repo.get_by_email(data.email)
        if not user or not user.password_hash:
            raise ValueError("Credenciales incorrectas.")

        if not PasswordHandler.verify(data.password, user.password_hash):
            raise ValueError("Credenciales incorrectas.")

        access_token = JWTHandler.create_access_token(
            subject=str(user.id),
            role=user.role.value,
            agency_id=user.agency_id,
            extra={"user_type": "user"},
        )
        refresh_token = JWTHandler.create_refresh_token(subject=str(user.id))
        return UserLoginOutput(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )


class CreateUserUseCase:
    def __init__(self, user_repo: IUserRepository):
        self._user_repo = user_repo

    async def execute(self, data: CreateUserInput) -> CreateUserOutput:
        existing = await self._user_repo.get_by_email(data.email)
        if existing:
            raise ValueError("Email ya registrado.")

        hashed_password = PasswordHandler.hash(data.password)
        user = User(
            id=None,
            email=data.email,
            username=data.username,
            role=UserRole(data.role),
            agency_id=data.agency_id,
            password_hash=hashed_password,
            status=UserStatus.ACTIVE,
        )
        created = await self._user_repo.create(user)
        return CreateUserOutput(created)
