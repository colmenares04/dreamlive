from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency
from app.adapters.db.models import AgencyORM, LicenseORM

router = APIRouter(prefix="/agencies", tags=["Agencies V2"])


class AgencyOut(BaseModel):
    id: str | None
    name: str
    is_active: bool


class CreateAgencyRequest(BaseModel):
    name: str
    email: Optional[str] = None
    password: Optional[str] = None
    superagent: Optional[str] = None
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None
    code: Optional[str] = None
    owner_id: Optional[str] = None


class ConfirmDeleteAgencyBody(BaseModel):
    password: str


@router.get("/", response_model=List[AgencyOut])
async def list_agencies(
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AgencyORM))
    agencies = res.scalars().all()
    return [AgencyOut(id=a.id, name=a.name, is_active=a.is_active) for a in agencies]


@router.post("/", response_model=AgencyOut)
async def create_agency(
    payload: CreateAgencyRequest,
    uow: Any = Depends(get_uow),
):
    import uuid
    agency_id = str(uuid.uuid4())
    code = payload.code or "".join([c for c in payload.name.upper() if c.isalnum()])[:20]
    
    new_agency = AgencyORM(
        id=agency_id,
        name=payload.name,
        code=code,
        email=payload.email,
        password=payload.password,
        is_active=True,
        role_permissions={},
    )
    uow.session.add(new_agency)
    await uow.session.flush()

    # Create the first superagent profile linked to the agency
    if payload.superagent:
        lic_id = str(uuid.uuid4())
        lic_key = f"DL-{str(uuid.uuid4())[:8].upper()}"
        new_license = LicenseORM(
            id=lic_id,
            key=lic_key,
            agency_id=agency_id,
            recruiter_name=payload.superagent,
            email=payload.admin_email or payload.email,
            admin_password=payload.admin_password or payload.password,
            is_active=True,
            role="agency_admin",
            keywords="",
        )
        uow.session.add(new_license)
        await uow.session.flush()

    await uow.session.commit()
    return AgencyOut(id=agency_id, name=payload.name, is_active=True)


@router.delete("/{agency_id}")
async def delete_agency(
    agency_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == agency_id))
    agency = res.scalar_one_or_none()
    if agency:
        await uow.session.delete(agency)
        await uow.session.flush()
        await uow.session.commit()
    return {"status": "deleted"}


@router.get("/{agency_id}/stats")
async def get_agency_stats(
    agency_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM
    
    # Get total licenses count
    res_licenses = await uow.session.execute(select(LicenseORM).where(LicenseORM.agency_id == agency_id))
    licenses = res_licenses.scalars().all()
    
    return {
        "licenses_count": len(licenses),
        "users_count": len(licenses),
        "total_revenue": len(licenses) * 100,
    }


@router.get("/my/permissions")
async def get_my_permissions(
    agency: Any = Depends(get_current_v2_agency),
):
    return agency.role_permissions or {}


@router.patch("/my/permissions")
async def update_my_permissions(
    permissions: dict,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    agency.role_permissions = permissions
    await uow.session.flush()
    await uow.session.commit()
    return {"status": "success", "role_permissions": permissions}
