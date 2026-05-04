"""
Notifications API – v2 (Web dashboard)
CRUD + WebSocket broadcast for real-time notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid, os, shutil

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import NotificationORM, NotificationReadORM

router = APIRouter(prefix="/notifications", tags=["Notifications V2"])


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    description_ext: str
    description_web: str
    images: list[str]
    created_at: str | None
    is_read: bool = False


class NotificationLatest(BaseModel):
    id: str
    title: str
    description_ext: str
    created_at: str | None
    image: str | None


# ── LIST ────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[NotificationOut])
async def list_notifications(
    limit: int = 20,
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
):
    from sqlalchemy import select, desc
    
    res = await uow.session.execute(
        select(NotificationORM).order_by(desc(NotificationORM.created_at)).limit(limit)
    )
    notifications = res.scalars().all()
    
    # Get read status for current user
    user_id = str(current_user.id) if hasattr(current_user, "id") else str(current_user.get("sub", ""))
    read_res = await uow.session.execute(
        select(NotificationReadORM.notification_id).where(NotificationReadORM.user_id == user_id)
    )
    read_ids = {r for r in read_res.scalars().all()}
    
    return [
        NotificationOut(
            id=str(n.id),
            user_id=str(n.user_id),
            title=n.title,
            description_ext=n.description_ext or "",
            description_web=n.description_web or "",
            images=n.images or [],
            created_at=n.created_at.isoformat() if n.created_at else None,
            is_read=str(n.id) in read_ids,
        ) for n in notifications
    ]


# ── LATEST (for extension) ──────────────────────────────────────────────────
@router.get("/latest", response_model=List[NotificationLatest])
async def latest_notifications(
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
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


# ── MARK AS READ ────────────────────────────────────────────────────────────
@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
):
    from sqlalchemy import select
    
    user_id = str(current_user.id) if hasattr(current_user, "id") else str(current_user.get("sub", ""))
    
    # Check if already read
    existing = await uow.session.execute(
        select(NotificationReadORM).where(
            NotificationReadORM.user_id == user_id,
            NotificationReadORM.notification_id == notification_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"ok": True, "already_read": True}
    
    read_record = NotificationReadORM(
        id=str(uuid.uuid4()),
        user_id=user_id,
        notification_id=notification_id,
    )
    uow.session.add(read_record)
    await uow.session.flush()
    await uow.session.commit()
    return {"ok": True}


# ── MARK ALL AS READ ────────────────────────────────────────────────────────
@router.post("/read-all")
async def mark_all_as_read(
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
):
    from sqlalchemy import select
    
    user_id = str(current_user.id) if hasattr(current_user, "id") else str(current_user.get("sub", ""))
    
    # Get all notification IDs
    all_notifs = await uow.session.execute(select(NotificationORM.id))
    all_ids = [str(r) for r in all_notifs.scalars().all()]
    
    # Get already read
    already_read = await uow.session.execute(
        select(NotificationReadORM.notification_id).where(NotificationReadORM.user_id == user_id)
    )
    read_set = {r for r in already_read.scalars().all()}
    
    # Insert missing
    for nid in all_ids:
        if nid not in read_set:
            uow.session.add(NotificationReadORM(
                id=str(uuid.uuid4()),
                user_id=user_id,
                notification_id=nid,
            ))
    
    await uow.session.flush()
    await uow.session.commit()
    return {"ok": True, "marked": len(all_ids) - len(read_set)}


# ── UNREAD COUNT ────────────────────────────────────────────────────────────
@router.get("/unread-count")
async def unread_count(
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
):
    from sqlalchemy import select, func
    
    user_id = str(current_user.id) if hasattr(current_user, "id") else str(current_user.get("sub", ""))
    
    total_res = await uow.session.execute(select(func.count(NotificationORM.id)))
    total = total_res.scalar() or 0
    
    read_res = await uow.session.execute(
        select(func.count(NotificationReadORM.id)).where(NotificationReadORM.user_id == user_id)
    )
    read_count = read_res.scalar() or 0
    
    return {"unread": max(0, total - read_count)}


# ── CREATE (superuser only) ────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_notification(
    request: Request,
    title: str = Form(...),
    description_ext: str = Form(""),
    description_web: str = Form(""),
    images: List[UploadFile] = File(default=[]),
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
):
    from datetime import datetime, timezone
    
    notif_id = str(uuid.uuid4())
    
    # Save images
    image_paths: list[str] = []
    if images and images[0].filename:
        base_dir = f"archives/publicacion_{notif_id}"
        os.makedirs(base_dir, exist_ok=True)
        
        for i, img in enumerate(images[:5]):
            if not img.filename:
                continue
            ext = os.path.splitext(img.filename)[1] or ".jpg"
            fname = f"img_{i+1}{ext}"
            fpath = os.path.join(base_dir, fname)
            with open(fpath, "wb") as buffer:
                shutil.copyfileobj(img.file, buffer)
            image_paths.append(f"/api/v2/{base_dir}/{fname}".replace("\\", "/"))
    
    notif = NotificationORM(
        id=notif_id,
        user_id=str(current_user.id) if hasattr(current_user, "id") else str(current_user.get("sub", "")),
        title=title,
        description_ext=description_ext,
        description_web=description_web,
        images=image_paths,
        created_at=datetime.now(timezone.utc),
    )
    uow.session.add(notif)
    await uow.session.flush()
    await uow.session.commit()
    
    # Broadcast via WebSocket (will be picked up by main.py sio reference)
    broadcast_payload = {
        "id": notif_id,
        "title": title,
        "description_ext": description_ext,
        "description_web": description_web,
        "images": image_paths,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }
    
    # Broadcast via WebSocket
    try:
        sio = request.app.state.sio
        await sio.emit("new_notification", broadcast_payload)
    except Exception as e:
        print(f"[WS] Could not broadcast notification: {e}")
    
    return {"ok": True, "id": notif_id}


# ── DELETE ──────────────────────────────────────────────────────────────────
@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    uow: Any = Depends(get_uow),
    current_user: Any = Depends(get_current_v2_agency),
):
    from sqlalchemy import select, delete as sql_delete
    
    res = await uow.session.execute(
        select(NotificationORM).where(NotificationORM.id == notification_id)
    )
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    
    # Delete reads
    await uow.session.execute(
        sql_delete(NotificationReadORM).where(NotificationReadORM.notification_id == notification_id)
    )
    
    # Delete images folder
    folder = f"archives/publicacion_{notification_id}"
    if os.path.exists(folder):
        shutil.rmtree(folder)
    
    await uow.session.delete(notif)
    await uow.session.flush()
    await uow.session.commit()
    return {"ok": True}
