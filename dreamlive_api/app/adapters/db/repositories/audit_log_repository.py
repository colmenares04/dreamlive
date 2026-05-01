from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.entities.audit_log import AuditLog
from app.core.ports.audit_log_repository import IAuditLogRepository
from app.adapters.db.models import AuditLogORM


class AuditLogRepository(IAuditLogRepository):
    """Implementación SQLAlchemy del repositorio de logs de auditoría."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: AuditLogORM) -> AuditLog:
        return AuditLog(
            id=str(orm.id),
            user_id=str(orm.user_id) if orm.user_id is not None else None,
            agency_id=str(orm.agency_id) if orm.agency_id is not None else None,
            category=orm.category,
            action=orm.action,
            entity_name=orm.entity_name,
            entity_id=orm.entity_id,
            old_data=orm.old_data,
            new_data=orm.new_data,
            ip_address=orm.ip_address,
            created_at=orm.created_at,
        )

    async def list_all(self, agency_id: Optional[str] = None) -> List[AuditLog]:
        stmt = select(AuditLogORM)
        if agency_id:
            stmt = stmt.where(AuditLogORM.agency_id == agency_id)
        stmt = stmt.order_by(AuditLogORM.created_at.desc())
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]

    async def create(self, log: AuditLog) -> AuditLog:
        orm = AuditLogORM(
            user_id=log.user_id if log.user_id else None,
            agency_id=log.agency_id if log.agency_id else None,
            category=log.category,
            action=log.action,
            entity_name=log.entity_name,
            entity_id=log.entity_id,
            old_data=log.old_data,
            new_data=log.new_data,
            ip_address=log.ip_address,
            created_at=log.created_at or datetime.utcnow(),
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def get_recent_activity(
        self, limit: int = 10, agency_id: Optional[str] = None
    ) -> List[AuditLog]:
        stmt = select(AuditLogORM)
        if agency_id:
            stmt = stmt.where(AuditLogORM.agency_id == agency_id)
        stmt = stmt.order_by(AuditLogORM.created_at.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return [self._to_domain(orm) for orm in result.scalars().all()]
