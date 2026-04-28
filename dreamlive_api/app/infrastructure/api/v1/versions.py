"""
Rutas relacionadas con versiones de la app (extraídas de routes.py).
"""
from typing import List
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from supabase import Client

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import AppVersionRepository
from app.application.licenses.use_cases import (
    PublishVersionUseCase, ActivateVersionUseCase,
    DeleteVersionUseCase, ListVersionsUseCase,
)
from app.infrastructure.api.deps import require_admin, get_current_user
from app.core.entities.user import User


versions_router = APIRouter(prefix="/versions", tags=["Versions"])


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


@versions_router.get("/")
async def list_versions(db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    versions = await ListVersionsUseCase(repo).execute()
    return [
        VersionOut(
            id=v.id, version_number=v.version_number, platform=v.platform,
            file_url=v.file_url, file_size_kb=v.file_size_kb, changelog=v.changelog,
            tags=v.tags, is_active=v.is_active,
            release_date=(v.release_date.isoformat() if hasattr(v, 'release_date') and v.release_date else None),
        ) for v in versions
    ]


@versions_router.post("/publish", status_code=201, dependencies=[Depends(require_admin)])
async def publish_version(body: PublishVersionBody, db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    versions = await PublishVersionUseCase(repo).execute(
        version_number=body.version_number, changelog=body.changelog, tags=body.tags,
        windows_url=body.windows_url, windows_size_kb=body.windows_size_kb,
        macos_url=body.macos_url, macos_size_kb=body.macos_size_kb,
    )
    return {"published": len(versions), "version": body.version_number}


@versions_router.patch("/{version_id}/activate", dependencies=[Depends(require_admin)])
async def activate_version(version_id: str, db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    await ActivateVersionUseCase(repo).execute(version_id)
    return {"ok": True}


@versions_router.delete("/{version_id}", dependencies=[Depends(require_admin)])
async def delete_version(version_id: str, db: Client = Depends(get_db)):
    repo = AppVersionRepository(db)
    await DeleteVersionUseCase(repo).execute(version_id)
    return {"ok": True}
