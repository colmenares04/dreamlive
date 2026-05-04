from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any
from pydantic import BaseModel

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_license

router = APIRouter(prefix="/notifications", tags=["Notifications Extension V2"])

class NotificationOut(BaseModel):
    id: str
    title: str
    description_ext: str | None
    image: str | None
    is_read: bool
    created_at: str | None

@router.get("/latest", response_model=List[NotificationOut])
async def get_latest_notifications(
    license: Any = Depends(get_current_v2_license),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import NotificationORM
    
    res = await uow.session.execute(
        select(NotificationORM)
        .where(NotificationORM.license_id == str(license.id))
        .order_by(NotificationORM.created_at.desc())
        .limit(10)
    )
    notifications = res.scalars().all()
    
    return [
        NotificationOut(
            id=str(n.id),
            title=n.title or "Notificación",
            description_ext=n.message or "",
            image=n.type if n.type and n.type.startswith("/archives") else None,
            is_read=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else None
        ) for n in notifications
    ]

@router.get("/unread-count")
async def get_unread_count(
    license: Any = Depends(get_current_v2_license),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    from app.adapters.db.models import NotificationORM
    
    res = await uow.session.execute(
        select(func.count())
        .where(NotificationORM.license_id == str(license.id), NotificationORM.is_read == False)
    )
    count = res.scalar() or 0
    return {"unread": count}

@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    license: Any = Depends(get_current_v2_license),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import NotificationORM
    
    res = await uow.session.execute(
        select(NotificationORM).where(NotificationORM.id == notification_id, NotificationORM.license_id == str(license.id))
    )
    n = res.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    
    n.is_read = True
    await uow.session.commit()
    return {"status": "ok"}
