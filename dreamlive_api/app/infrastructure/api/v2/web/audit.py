from fastapi import APIRouter, Depends
from typing import Any, List, Optional
from pydantic import BaseModel

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency

router = APIRouter(prefix="/audit", tags=["Audit V2"])


class AuditLogOut(BaseModel):
    id: str | None
    user_id: str | None
    agency_id: str | None
    category: str
    action: str
    entity_name: str | None
    entity_id: str | None
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    ip_address: str | None
    created_at: Optional[str]


@router.get("/", response_model=List[AuditLogOut])
async def list_audit_logs(
    agency_id: Optional[str] = None,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import AuditLogORM

    target_agency_id = agency_id if agency_id else str(agency.id)
    stmt = select(AuditLogORM).where(AuditLogORM.agency_id == target_agency_id)

    res = await uow.session.execute(stmt)
    logs = res.scalars().all()

    return [
        AuditLogOut(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            agency_id=str(log.agency_id) if log.agency_id else None,
            category=log.category or "",
            action=log.action or "",
            entity_name=log.entity_name,
            entity_id=log.entity_id,
            old_data=log.old_data,
            new_data=log.new_data,
            ip_address=log.ip_address,
            created_at=log.created_at.isoformat() if hasattr(log.created_at, "isoformat") and log.created_at else None,
        ) for log in logs
    ]
