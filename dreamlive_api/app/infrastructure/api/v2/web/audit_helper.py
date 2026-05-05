from typing import Any, Optional
import uuid
from datetime import datetime, timezone
from app.adapters.db.models import AuditLogORM

async def create_audit_log(
    uow: Any,
    action: str,
    category: str,
    agency_id: Optional[str] = None,
    user_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    entity_id: Optional[str] = None,
    old_data: Optional[dict] = None,
    new_data: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    log = AuditLogORM(
        id=str(uuid.uuid4()),
        user_id=user_id,
        agency_id=agency_id,
        category=category,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        old_data=old_data,
        new_data=new_data,
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    uow.session.add(log)
    await uow.session.flush()
    return log
