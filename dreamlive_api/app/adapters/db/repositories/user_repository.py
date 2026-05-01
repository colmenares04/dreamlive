from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.user import User, UserRole, UserStatus
from app.core.ports.repositories import IUserRepository
from app.adapters.db.models import UserORM


class UserRepository(IUserRepository):
    """
    Repositorio concreto de usuarios utilizando SQLAlchemy.
    """
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_domain(self, orm: UserORM) -> User:
        return User(
            id=str(orm.id),
            email=orm.email,
            username=orm.username,
            role=orm.role,
            agency_id=str(orm.agency_id) if orm.agency_id is not None else None,
            password_hash=orm.hashed_password,
            status=orm.status,
        )

    async def get_by_id(self, user_id: str) -> Optional[User]:
        if not user_id:
            return None
        result = await self._session.execute(select(UserORM).where(UserORM.id == user_id))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_by_email(self, email: str) -> Optional[User]:
        if not email:
            return None
        result = await self._session.execute(select(UserORM).where(UserORM.email == email))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def create(self, user: User) -> User:
        orm = UserORM(
            email=user.email,
            username=user.username,
            full_name=user.username,
            hashed_password=user.password_hash or "",
            role=user.role,
            status=user.status,
            agency_id=user.agency_id,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def update(self, user: User) -> User:
        if not user.id:
            raise ValueError("User ID required to update.")
        result = await self._session.execute(select(UserORM).where(UserORM.id == user.id))
        orm = result.scalar_one_or_none()
        if not orm:
            raise ValueError(f"User with ID {user.id} not found.")

        orm.email = user.email
        orm.username = user.username
        if user.password_hash:
            orm.hashed_password = user.password_hash
        orm.role = user.role
        orm.status = user.status
        orm.agency_id = user.agency_id

        await self._session.flush()
        return self._to_domain(orm)

    async def list_all(self, agency_id: Optional[str] = None) -> List[User]:
        stmt = select(UserORM)
        if agency_id:
            stmt = stmt.where(UserORM.agency_id == agency_id)
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def delete(self, user_id: str) -> None:
        if not user_id:
            return
        result = await self._session.execute(select(UserORM).where(UserORM.id == user_id))
        orm = result.scalar_one_or_none()
        if orm:
            await self._session.delete(orm)
            await self._session.flush()
