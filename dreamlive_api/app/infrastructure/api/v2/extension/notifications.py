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
    from sqlalchemy import select, outerjoin
    from app.adapters.db.models import NotificationORM, NotificationReadORM
    
    user_id = str(license.id)
    
    # Obtenemos las 10 últimas notificaciones y verificamos si el usuario las ha leído
    stmt = (
        select(NotificationORM, NotificationReadORM.id)
        .outerjoin(
            NotificationReadORM, 
            (NotificationReadORM.notification_id == NotificationORM.id) & (NotificationReadORM.user_id == user_id)
        )
        .order_by(NotificationORM.created_at.desc())
        .limit(10)
    )
    
    res = await uow.session.execute(stmt)
    rows = res.all()
    
    return [
        NotificationOut(
            id=str(n.id),
            title=n.title or "Notificación",
            description_ext=n.description_ext or "",
            image=n.images[0] if n.images and len(n.images) > 0 else None,
            is_read=read_id is not None,
            created_at=n.created_at.isoformat() if n.created_at else None
        ) for n, read_id in rows
    ]

@router.get("/unread-count")
async def get_unread_count(
    license: Any = Depends(get_current_v2_license),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func, outerjoin
    from app.adapters.db.models import NotificationORM, NotificationReadORM
    
    user_id = str(license.id)
    
    # Contamos notificaciones que no tienen entrada en NotificationReadORM para este usuario
    stmt = (
        select(func.count(NotificationORM.id))
        .outerjoin(
            NotificationReadORM, 
            (NotificationReadORM.notification_id == NotificationORM.id) & (NotificationReadORM.user_id == user_id)
        )
        .where(NotificationReadORM.id == None)
    )
    
    res = await uow.session.execute(stmt)
    count = res.scalar() or 0
    return {"unread": count}

@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    license: Any = Depends(get_current_v2_license),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import NotificationORM, NotificationReadORM
    
    user_id = str(license.id)
    
    # Verificar que la notificación existe
    res = await uow.session.execute(select(NotificationORM).where(NotificationORM.id == notification_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    
    # Verificar si ya está leída
    res_read = await uow.session.execute(
        select(NotificationReadORM).where(
            NotificationReadORM.notification_id == notification_id,
            NotificationReadORM.user_id == user_id
        )
    )
    if not res_read.scalar_one_or_none():
        new_read = NotificationReadORM(
            notification_id=notification_id,
            user_id=user_id
        )
        uow.session.add(new_read)
        await uow.session.commit()
        
    return {"status": "ok"}
