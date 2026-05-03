from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.adapters.db.models import AppVersionORM
from app.core.entities.app_version import Platform

router = APIRouter(prefix="/versions", tags=["Versions V2"])


class VersionOut(BaseModel):
    id: str | None
    version_number: str
    platform: str
    file_url: str
    file_size_kb: int
    changelog: str
    tags: List[str]
    is_active: bool
    release_date: str | None


class PublishVersionBody(BaseModel):
    version_number: str
    changelog: str
    tags: List[str]
    windows_url: str
    windows_size_kb: int
    macos_url: str
    macos_size_kb: int


@router.get("/", response_model=List[VersionOut])
async def list_versions(
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AppVersionORM))
    versions = res.scalars().all()
    return [
        VersionOut(
            id=str(v.id),
            version_number=v.version_number,
            platform=v.platform.value if hasattr(v.platform, "value") else str(v.platform),
            file_url=v.file_url or "",
            file_size_kb=v.file_size_kb or 0,
            changelog=v.changelog or "",
            tags=v.tags or [],
            is_active=v.is_active,
            release_date=v.release_date.isoformat() if hasattr(v.release_date, "isoformat") and v.release_date else None,
        ) for v in versions
    ]


@router.post("/publish", status_code=201)
async def publish_version(
    version_number: str = Form(...),
    changelog: str = Form(...),
    tags: str = Form(""),
    win_file: UploadFile = File(...),
    mac_file: UploadFile = File(...),
    uow: Any = Depends(get_uow),
):
    from datetime import datetime, timezone
    import os
    import shutil
    
    # Directorio base
    base_dir = f"archives/version/v.{version_number}"
    os.makedirs(base_dir, exist_ok=True)
    
    # Extensiones originales
    win_ext = os.path.splitext(win_file.filename)[1] if win_file.filename else ".zip"
    mac_ext = os.path.splitext(mac_file.filename)[1] if mac_file.filename else ".zip"
    
    # Nombres finales
    win_filename = f"Dreamlive_Win_V.{version_number}{win_ext}"
    mac_filename = f"DreamLive_Mac_V.{version_number}{mac_ext}"
    
    win_path = os.path.join(base_dir, win_filename)
    mac_path = os.path.join(base_dir, mac_filename)
    
    # Guardar archivos
    with open(win_path, "wb") as buffer:
        shutil.copyfileobj(win_file.file, buffer)
        
    with open(mac_path, "wb") as buffer:
        shutil.copyfileobj(mac_file.file, buffer)
        
    win_size_kb = os.path.getsize(win_path) // 1024
    mac_size_kb = os.path.getsize(mac_path) // 1024
    
    # Construir URLs relativas
    win_url = f"/api/v2/{base_dir}/{win_filename}".replace("\\", "/")
    mac_url = f"/api/v2/{base_dir}/{mac_filename}".replace("\\", "/")
    
    parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]
    
    v1_id = str(uuid.uuid4())
    v1 = AppVersionORM(
        id=v1_id,
        version_number=version_number,
        platform=Platform.WINDOWS,
        file_url=win_url,
        file_size_kb=win_size_kb,
        changelog=changelog,
        tags=parsed_tags,
        is_active=True,
        release_date=datetime.now(timezone.utc),
    )
    uow.session.add(v1)

    v2_id = str(uuid.uuid4())
    v2 = AppVersionORM(
        id=v2_id,
        version_number=version_number,
        platform=Platform.MACOS,
        file_url=mac_url,
        file_size_kb=mac_size_kb,
        changelog=changelog,
        tags=parsed_tags,
        is_active=True,
        release_date=datetime.now(timezone.utc),
    )
    uow.session.add(v2)

    await uow.session.flush()
    await uow.session.commit()
    return {"published": 2, "version": version_number}


@router.patch("/{version_id}/activate")
async def activate_version(
    version_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AppVersionORM).where(AppVersionORM.id == version_id))
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Versión no encontrada.")
        
    v.is_active = True
    await uow.session.flush()
    await uow.session.commit()
    return {"ok": True}


@router.delete("/{version_id}")
async def delete_version(
    version_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AppVersionORM).where(AppVersionORM.id == version_id))
    v = res.scalar_one_or_none()
    if v:
        await uow.session.delete(v)
        await uow.session.flush()
        await uow.session.commit()
    return {"ok": True}
