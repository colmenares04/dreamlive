from datetime import datetime, timedelta, time, date
from typing import Dict, List, Optional, Tuple
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.lead import Lead, LeadStatus
from app.core.ports.lead_repository import ILeadRepository
from app.adapters.db.models import LeadORM


class LeadRepository(ILeadRepository):
    """Implementación SQLAlchemy del repositorio de leads (prospectos TikTok)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: LeadORM) -> Lead:
        return Lead(
            id=str(orm.id),
            license_id=str(orm.license_id),
            username=orm.username,
            status=orm.status,
            captured_at=orm.captured_at,
            verified_at=orm.verified_at,
            contacted_at=orm.contacted_at,
            viewer_count=orm.viewer_count,
            source=orm.source,
            likes_count=orm.likes_count,
        )

    async def get_by_id(self, lead_id: str) -> Optional[Lead]:
        if not lead_id:
            return None
        result = await self._session.execute(select(LeadORM).where(LeadORM.id == lead_id))
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def create(self, lead: Lead) -> Lead:
        from app.adapters.db.models import LicenseORM
        res = await self._session.execute(
            select(LicenseORM.agency_id).where(LicenseORM.id == lead.license_id)
        )
        agency_id = res.scalar_one_or_none() or str(lead.license_id)

        orm = LeadORM(
            license_id=lead.license_id,
            agency_id=agency_id,
            username=lead.username,
            status=lead.status,
            viewer_count=lead.viewer_count,
            source=lead.source,
            likes_count=lead.likes_count,
            captured_at=lead.captured_at or datetime.utcnow(),
            verified_at=lead.verified_at,
            contacted_at=lead.contacted_at,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def update(self, lead: Lead) -> Lead:
        if not lead.id:
            raise ValueError("Lead ID required to update.")
        result = await self._session.execute(select(LeadORM).where(LeadORM.id == lead.id))
        orm = result.scalar_one_or_none()
        if not orm:
            raise ValueError(f"Lead with ID {lead.id} not found.")

        orm.status = lead.status
        orm.viewer_count = lead.viewer_count
        orm.likes_count = lead.likes_count
        orm.source = lead.source
        orm.verified_at = lead.verified_at
        orm.contacted_at = lead.contacted_at

        await self._session.flush()
        return self._to_domain(orm)

    async def get_by_username(self, license_id: str, username: str) -> Optional[Lead]:
        if not license_id or not username:
            return None
        result = await self._session.execute(
            select(LeadORM).where(and_(LeadORM.license_id == license_id, LeadORM.username == username))
        )
        orm = result.scalar_one_or_none()
        return self._to_domain(orm) if orm else None

    async def delete(self, lead_id: str) -> bool:
        if not lead_id:
            return False
        result = await self._session.execute(select(LeadORM).where(LeadORM.id == lead_id))
        orm = result.scalar_one_or_none()
        if orm:
            await self._session.delete(orm)
            await self._session.flush()
            return True
        return False

    async def delete_by_status(self, license_ids: List[str], status: LeadStatus) -> int:
        if not license_ids:
            return 0
        result = await self._session.execute(
            select(LeadORM).where(and_(LeadORM.license_id.in_(license_ids), LeadORM.status == status))
        )
        orms = result.scalars().all()
        for orm in orms:
            await self._session.delete(orm)
        await self._session.flush()
        return len(orms)

    async def count_by_status_bulk(self, license_ids: List[str]) -> Dict[str, int]:
        if not license_ids:
            return {}
        stmt = select(LeadORM.status, func.count(LeadORM.id)).where(
            LeadORM.license_id.in_(license_ids)
        ).group_by(LeadORM.status)
        result = await self._session.execute(stmt)
        return {str(row[0].value if hasattr(row[0], "value") else row[0]): row[1] for row in result.all()}

    async def count_under_date(self, license_ids: List[str], max_date: datetime) -> Dict[str, int]:
        if not license_ids:
            return {}
        stmt = select(LeadORM.status, func.count(LeadORM.id)).where(
            and_(LeadORM.license_id.in_(license_ids), LeadORM.captured_at >= max_date)
        ).group_by(LeadORM.status)
        result = await self._session.execute(stmt)
        return {str(row[0].value if hasattr(row[0], "value") else row[0]): row[1] for row in result.all()}

    async def count_by_status_grouped_by_license(self, license_ids: List[str]) -> Dict[str, Dict[str, int]]:
        if not license_ids:
            return {}
        stmt = select(LeadORM.license_id, LeadORM.status, func.count(LeadORM.id)).where(
            LeadORM.license_id.in_(license_ids)
        ).group_by(LeadORM.license_id, LeadORM.status)
        result = await self._session.execute(stmt)
        out = {}
        for row in result.all():
            lid = str(row[0])
            stat_val = str(row[1].value if hasattr(row[1], "value") else row[1]).lower()
            count = row[2]
            if lid not in out:
                out[lid] = {}
            out[lid][stat_val] = count
            if hasattr(row[1], "name"):
                out[lid][row[1].name.lower()] = count
        return out

    async def list_all(
        self,
        license_id: Optional[str] = None,
        status: Optional[LeadStatus] = None,
        username: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Lead]:
        stmt = select(LeadORM)
        filters = []
        if license_id:
            filters.append(LeadORM.license_id == license_id)
        if status:
            filters.append(LeadORM.status == status)
        if username:
            filters.append(LeadORM.username.ilike(f"%{username}%"))
        if start_date:
            filters.append(LeadORM.captured_at >= start_date)
        if end_date:
            filters.append(LeadORM.captured_at <= end_date)

        if filters:
            stmt = stmt.where(and_(*filters))
        stmt = stmt.order_by(LeadORM.captured_at.desc())
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def paginate(
        self,
        page: int = 1,
        limit: int = 20,
        license_id: Optional[str] = None,
        status: Optional[LeadStatus] = None,
        username: Optional[str] = None,
    ) -> Tuple[List[Lead], int]:
        stmt = select(LeadORM)
        filters = []
        if license_id:
            filters.append(LeadORM.license_id == license_id)
        if status:
            filters.append(LeadORM.status == status)
        if username:
            filters.append(LeadORM.username.ilike(f"%{username}%"))

        if filters:
            stmt = stmt.where(and_(*filters))

        # Count
        count_stmt = select(func.count(LeadORM.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar() or 0

        # Paginated results
        offset = (page - 1) * limit
        stmt = stmt.order_by(LeadORM.captured_at.desc()).offset(offset).limit(limit)
        res = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in res.scalars().all()], total

    async def update_status(self, lead_id: str, status: LeadStatus) -> bool:
        if not lead_id:
            return False
        result = await self._session.execute(select(LeadORM).where(LeadORM.id == lead_id))
        orm = result.scalar_one_or_none()
        if orm:
            orm.status = status
            await self._session.flush()
            return True
        return False

    async def delete_old_leads(self, license_id: str, days: int = 30) -> int:
        if not license_id:
            return 0
        limit_date = datetime.utcnow() - timedelta(days=days)
        stmt = select(LeadORM).where(
            and_(LeadORM.license_id == license_id, LeadORM.captured_at < limit_date)
        )
        result = await self._session.execute(stmt)
        orms = result.scalars().all()
        for orm in orms:
            await self._session.delete(orm)
        await self._session.flush()
        return len(orms)

    async def list_paginated(
        self,
        license_ids: List[str],
        page: int = 1,
        page_size: int = 50,
        status: Optional[LeadStatus] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        min_viewers: Optional[int] = None,
        min_likes: Optional[int] = None,
    ) -> Tuple[List[Lead], int]:
        stmt = select(LeadORM)
        filters = []
        if license_ids:
            filters.append(LeadORM.license_id.in_(license_ids))
        if status:
            filters.append(LeadORM.status == status)
        if source:
            filters.append(LeadORM.source == source)
        if search:
            filters.append(LeadORM.username.ilike(f"%{search}%"))
        if min_viewers is not None:
            filters.append(LeadORM.viewer_count >= min_viewers)
        if min_likes is not None:
            filters.append(LeadORM.likes_count >= min_likes)

        if filters:
            stmt = stmt.where(and_(*filters))

        count_stmt = select(func.count(LeadORM.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar() or 0

        offset = (page - 1) * page_size
        stmt = stmt.order_by(LeadORM.captured_at.desc()).offset(offset).limit(page_size)
        res = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in res.scalars().all()], total

    async def count_by_status(self, license_id: str) -> Dict[str, int]:
        if not license_id:
            return {}
        stmt = select(LeadORM.status, func.count(LeadORM.id)).where(
            LeadORM.license_id == license_id
        ).group_by(LeadORM.status)
        result = await self._session.execute(stmt)
        return {str(row[0].value if hasattr(row[0], "value") else row[0]): row[1] for row in result.all()}

    async def get_daily_stats_bulk(self, license_ids: List[str], days: int) -> List[Dict]:
        if not license_ids:
            return []
        start_date = datetime.utcnow() - timedelta(days=days)
        stmt = select(func.to_char(LeadORM.captured_at, 'YYYY-MM-DD'), func.count(LeadORM.id)).where(
            and_(LeadORM.license_id.in_(license_ids), LeadORM.captured_at >= start_date)
        ).group_by(func.to_char(LeadORM.captured_at, 'YYYY-MM-DD')).order_by(func.to_char(LeadORM.captured_at, 'YYYY-MM-DD').desc())
        
        result = await self._session.execute(stmt)
        return [{"date": row[0], "count": row[1]} for row in result.all()]

    async def get_license_performance_stats(
        self, license_ids: List[str]
    ) -> Dict[str, Dict[str, int]]:
        if not license_ids:
            return {}
        today_start = datetime.combine(date.today(), time.min)
        
        stmt_total = select(LeadORM.license_id, func.count(LeadORM.id)).where(
            LeadORM.license_id.in_(license_ids)
        ).group_by(LeadORM.license_id)
        res_total = await self._session.execute(stmt_total)
        
        stmt_today = select(LeadORM.license_id, func.count(LeadORM.id)).where(
            and_(LeadORM.license_id.in_(license_ids), LeadORM.captured_at >= today_start)
        ).group_by(LeadORM.license_id)
        res_today = await self._session.execute(stmt_today)
        
        out = {str(lid): {"today": 0, "total": 0} for lid in license_ids}
        for lid, count in res_total.all():
            out[str(lid)]["total"] = count
        for lid, count in res_today.all():
            out[str(lid)]["today"] = count
        return out

    async def update_status_bulk(
        self, license_id: str, usernames: List[str], new_status: LeadStatus
    ) -> int:
        if not license_id or not usernames:
            return 0
        stmt = select(LeadORM).where(
            and_(LeadORM.license_id == license_id, LeadORM.username.in_(usernames))
        )
        result = await self._session.execute(stmt)
        orms = result.scalars().all()
        for orm in orms:
            orm.status = new_status
        await self._session.flush()
        return len(orms)

    async def delete_bulk_by_username(
        self, license_id: str, usernames: List[str]
    ) -> int:
        if not license_id or not usernames:
            return 0
        stmt = select(LeadORM).where(
            and_(LeadORM.license_id == license_id, LeadORM.username.in_(usernames))
        )
        result = await self._session.execute(stmt)
        orms = result.scalars().all()
        for orm in orms:
            await self._session.delete(orm)
        await self._session.flush()
        return len(orms)
