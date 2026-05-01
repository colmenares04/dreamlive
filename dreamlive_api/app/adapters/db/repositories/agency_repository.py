from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.agency import Agency
from app.core.ports.agency_repository import IAgencyRepository
from app.adapters.db.models import AgencyORM


class AgencyRepository(IAgencyRepository):
    """Implementación SQLAlchemy del repositorio de agencias."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: AgencyORM) -> Agency:
        return Agency(
            id=str(orm.id),
            name=orm.name,
            logo_url=orm.logo_url,
            email=orm.email,
            password=orm.password,
            created_at=orm.created_at,
        )

    async def get_by_id(self, agency_id: str) -> Optional[Agency]:
        if not agency_id:
            return None
        result = await self._session.execute(select(AgencyORM).where(AgencyORM.id == agency_id))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def get_by_email(self, email: str) -> Optional[Agency]:
        if not email:
            return None
        result = await self._session.execute(select(AgencyORM).where(AgencyORM.email == email))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def create(self, agency: Agency) -> Agency:
        orm = AgencyORM(
            name=agency.name,
            logo_url=agency.logo_url,
            email=agency.email,
            password=agency.password,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def update(self, agency: Agency) -> Agency:
        if not agency.id:
            raise ValueError("Agency ID required to update.")
        result = await self._session.execute(select(AgencyORM).where(AgencyORM.id == agency.id))
        orm = result.scalar_one_or_none()
        if not orm:
            raise ValueError(f"Agency with ID {agency.id} not found.")

        orm.name = agency.name
        orm.logo_url = agency.logo_url
        orm.email = agency.email
        orm.password = agency.password

        await self._session.flush()
        return self._to_domain(orm)

    async def list_all(self) -> List[Agency]:
        result = await self._session.execute(select(AgencyORM))
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def delete(self, agency_id: str) -> None:
        if not agency_id:
            return
        result = await self._session.execute(select(AgencyORM).where(AgencyORM.id == agency_id))
        orm = result.scalar_one_or_none()
        if orm:
            await self._session.delete(orm)
            await self._session.flush()
