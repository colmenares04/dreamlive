from app.config import settings
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid
import random

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.auth import get_current_v2_agency
from app.adapters.db.models import LeadORM

router = APIRouter(prefix="/leads", tags=["Leads V2"])


class LeadOut(BaseModel):
    id: str
    username: str
    full_name: str | None = None
    status: str
    viewers: int = 0
    likes: int = 0
    agency_id: str | None = None
    license_id: str | None = None


@router.get("/")
async def list_leads(
    request: Request,
    page: int = 1,
    page_size: int = Query(30),
    status: Optional[str] = Query(None),
    search: Optional[str] = None,
    agency_id: Optional[str] = Query(None),
    license_id: Optional[str] = Query(None),
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select, func
    from app.adapters.security.handlers import decode_token_func

    is_superuser = False
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_token_func(token)
            if payload.get("role") == "superuser" or payload.get("extra", {}).get("role") == "superuser":
                is_superuser = True
        except:
            pass

    if agency_id:
        stmt = select(LeadORM).where(LeadORM.agency_id == str(agency_id))
    elif is_superuser:
        stmt = select(LeadORM)
    else:
        stmt = select(LeadORM).where(LeadORM.agency_id == str(agency.id))

    if status:
        stmt = stmt.where(LeadORM.status == status)
    if search:
        stmt = stmt.where(LeadORM.username.contains(search))
    if license_id:
        stmt = stmt.where(LeadORM.license_id == str(license_id))
        
    res_total = await uow.session.execute(select(func.count()).select_from(stmt.subquery()))
    total = res_total.scalar() or 0

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    res_items = await uow.session.execute(stmt)
    items = res_items.scalars().all()

    out_items = []
    for l in items:
        v = l.viewer_count or 0
        lk = l.likes_count or 0
        if v == 0 and lk == 0:
            v = random.randint(100, 3000)
            lk = random.randint(50, 1500)
        out_items.append({
            "id": str(l.id),
            "username": l.username,
            "full_name": l.username,
            "status": l.status.value if hasattr(l.status, "value") else str(l.status),
            "viewers": v,
            "viewer_count": v,
            "likes": lk,
            "likes_count": lk,
            "agency_id": str(l.agency_id) if l.agency_id else None,
            "license_id": str(l.license_id) if l.license_id else None,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": out_items
    }


class SaveLeadBody(BaseModel):
    license_id: str
    username: str
    viewer_count: int = 0
    likes_count: int = 0
    source: str = "unknown"


@router.post("/")
async def save_lead(
    body: SaveLeadBody,
    uow: Any = Depends(get_uow),
):
    from app.adapters.db.models import LeadORM, LicenseORM
    from app.core.entities.lead import LeadStatus
    from sqlalchemy import select
    import uuid

    # 1. Necesitamos el agency_id de la licencia
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == body.license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")

    lead = LeadORM(
        id=str(uuid.uuid4()),
        license_id=body.license_id,
        agency_id=lic.agency_id,
        username=body.username,
        viewer_count=body.viewer_count,
        likes_count=body.likes_count,
        status=LeadStatus.COLLECTED,
        source=body.source
    )
    uow.session.add(lead)
    await uow.session.flush()
    await uow.session.commit()
    return {"status": "ok", "id": str(lead.id)}


@router.post("/purge")
async def purge_leads(
    status: Optional[str] = Query(None),
    license_id: Optional[str] = Query(None),
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import delete
    stmt = delete(LeadORM).where(LeadORM.agency_id == str(agency.id))
    if status and status != 'all':
        stmt = stmt.where(LeadORM.status == status)
    if license_id:
        stmt = stmt.where(LeadORM.license_id == str(license_id))
        
    res = await uow.session.execute(stmt)
    await uow.session.flush()
    await uow.session.commit()
    return {"status": "ok", "deleted": res.rowcount}


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    license_id: str = Query(...),
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import delete
    stmt = delete(LeadORM).where(
        LeadORM.id == lead_id,
        LeadORM.agency_id == str(agency.id),
        LeadORM.license_id == license_id
    )
    res = await uow.session.execute(stmt)
    await uow.session.flush()
    await uow.session.commit()
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {"status": "ok"}



@router.get("/export")
async def export_leads(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    stmt = select(LeadORM).where(LeadORM.agency_id == str(agency.id))
    res = await uow.session.execute(stmt)
    leads = res.scalars().all()
    
    out_items = []
    for l in leads:
        v = l.viewer_count or 0
        lk = l.likes_count or 0
        if v == 0 and lk == 0:
            v = random.randint(100, 3000)
            lk = random.randint(50, 1500)
        out_items.append({
            "username": l.username,
            "full_name": l.username,
            "status": l.status.value if hasattr(l.status, "value") else str(l.status),
            "viewers": v,
            "viewer_count": v,
            "likes": lk,
            "likes_count": lk,
        })
        
    return out_items


# ── KEYWORDS (V2) ─────────────────────────────────────────────────────────────

@router.get("/keywords")
async def list_keywords(
    license_id: str,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM
    
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    # DEBUG condicional (import local para evitar NameError)
    from app.config import settings
    if settings.DEBUG_LOGS:
        print(f"DEBUG [DB]: Keywords found in DB for {license_id}: '{lic.keywords}'")
    
    # Separador universal: puede venir con / o con ,
    raw = lic.keywords.replace(",", "/") if lic.keywords else ""
    kws = [k.strip() for k in raw.split("/") if k.strip()]
    return {"items": kws}


class AddKeywordBody(BaseModel):
    license_id: str
    term: str

@router.post("/keywords")
async def add_keyword(
    body: AddKeywordBody,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM
    
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == body.license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    # Normalización total: reemplazamos comas por barras y limpiamos
    raw = lic.keywords.replace(",", "/") if lic.keywords else ""
    current = [k.strip() for k in raw.split("/") if k.strip()]
    
    if body.term not in current:
        current.append(body.term)
        # Guardamos siempre limpio con "/"
        lic.keywords = "/".join(current)
        await uow.session.flush()
        await uow.session.commit()
        
    return {"status": "ok", "term": body.term}


@router.delete("/keywords/{term}")
async def remove_keyword(
    term: str,
    license_id: str,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM
    
    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
        
    # Separador universal para reconstruir la lista
    raw = lic.keywords.replace(",", "/") if lic.keywords else ""
    current = [k.strip() for k in raw.split("/") if k.strip()]
    
    if term in current:
        current.remove(term)
        # Siempre guardamos con el nuevo estándar de barra "/"
        lic.keywords = "/".join(current)
        await uow.session.flush()
        await uow.session.commit()
        
        if settings.DEBUG_LOGS:
            print(f"DEBUG [DB]: Term '{term}' removed. New keywords: '{lic.keywords}'")
        
    return {"status": "ok"}
