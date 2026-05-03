"""
Notifications API – v1 (Extension)
Read-only endpoints for the browser extension to fetch and track notifications.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, List
import uuid

from app.infrastructure.api.deps import get_uow, get_current_user
from app.adapters.db.models import NotificationORM, NotificationReadORM

router = APIRouter(prefix="/notifications", tags=["Notifications V1"])


class NotificationLatest(BaseModel):
    id: str
    title: str
    description_ext: str
    created_at: str | None
    image: str | None


@router.get("/latest", response_model=List[NotificationLatest])
async def latest_notifications(
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_user),
):
    from sqlalchemy import select, desc
    
    res = await uow.session.execute(
        select(NotificationORM).order_by(desc(NotificationORM.created_at)).limit(5)
    )
    notifications = res.scalars().all()
    return [
        NotificationLatest(
            id=str(n.id),
            title=n.title,
            description_ext=n.description_ext or "",
            created_at=n.created_at.isoformat() if n.created_at else None,
            image=(n.images[0] if n.images else None),
        ) for n in notifications
    ]


@router.get("/unread-count")
async def unread_count(
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_user),
):
    from sqlalchemy import select, func
    
    user_id = str(current_user.id)
    
    total_res = await uow.session.execute(select(func.count(NotificationORM.id)))
    total = total_res.scalar() or 0
    
    read_res = await uow.session.execute(
        select(func.count(NotificationReadORM.id)).where(NotificationReadORM.user_id == user_id)
    )
    read_count = read_res.scalar() or 0
    
    return {"unread": max(0, total - read_count)}


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_user),
):
    from sqlalchemy import select
    
    user_id = str(current_user.id)
    
    existing = await uow.session.execute(
        select(NotificationReadORM).where(
            NotificationReadORM.user_id == user_id,
            NotificationReadORM.notification_id == notification_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"ok": True}
    
    uow.session.add(NotificationReadORM(
        id=str(uuid.uuid4()),
        user_id=user_id,
        notification_id=notification_id,
    ))
    await uow.session.flush()
    await uow.session.commit()
    return {"ok": True}
