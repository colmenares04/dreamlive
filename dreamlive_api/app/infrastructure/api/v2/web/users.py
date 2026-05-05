from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Any, List, Optional
import uuid

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_agency, bearer_scheme
from app.adapters.db.models import LicenseORM

from app.infrastructure.api.v2.web.audit_helper import create_audit_log
from fastapi import Request

router = APIRouter(prefix="/users", tags=["Users V2"])


class ProfileUserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    status: str
    agency_id: str | None


class CreateUserRequest(BaseModel):
    username: str
    full_name: Optional[str] = None
    email: str
    password: Optional[str] = None
    role: str
    agency_id: Optional[str] = None
    license_id: Optional[str] = None


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None


@router.get("/", response_model=List[ProfileUserOut])
async def list_users(
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    stmt = select(LicenseORM).where(LicenseORM.agency_id == str(agency.id))
    res = await uow.session.execute(stmt)
    lics = res.scalars().all()
    
    return [
        ProfileUserOut(
            id=str(u.id),
            username=u.recruiter_name or "",
            email=u.email or "",
            role=u.role or "agency_admin",
            status="active",
            agency_id=str(u.agency_id) if u.agency_id else None,
        ) for u in lics
    ]


@router.post("/", response_model=ProfileUserOut)
async def create_user(
    payload: CreateUserRequest,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    import uuid

    if not payload.license_id:
        raise HTTPException(status_code=400, detail="Debes seleccionar una licencia válida para asignar al nuevo usuario.")

    res = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == payload.license_id))
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    if lic.email and lic.admin_password:
        raise HTTPException(status_code=400, detail="Esta licencia ya está asignada a un usuario.")

    res_email = await uow.session.execute(select(LicenseORM).where(LicenseORM.email == payload.email))
    existing = res_email.scalar_one_or_none()
    if existing and existing.id != lic.id:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    lic.recruiter_name = payload.username
    lic.email = payload.email
    lic.admin_password = payload.password or "admin123"
    lic.role = payload.role or "agency_admin"
    
    await uow.session.flush()
    await uow.session.commit()
    
    return ProfileUserOut(
        id=str(lic.id),
        username=lic.recruiter_name,
        email=lic.email,
        role=lic.role,
        status="active",
        agency_id=str(lic.agency_id) if lic.agency_id else None,
    )


@router.patch("/{user_id}", response_model=ProfileUserOut)
async def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    agency_context: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
    credentials: Any = Depends(bearer_scheme),
):
    from sqlalchemy import select
    
    res = await uow.session.execute(
        select(LicenseORM).where(
            LicenseORM.id == user_id,
            LicenseORM.agency_id == str(agency_context.id)
        )
    )
    lic = res.scalar_one_or_none()
    if not lic:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        
    if payload.username is not None:
        lic.recruiter_name = payload.username
    if payload.full_name is not None:
        lic.full_name = payload.full_name
    if payload.email is not None:
        # Verificar si el email ya existe en otra licencia
        res_email = await uow.session.execute(
            select(LicenseORM).where(
                LicenseORM.email == payload.email, 
                LicenseORM.id != user_id
            )
        )
        if res_email.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El correo electrónico ya está en uso.")
        lic.email = payload.email

    if payload.password is not None:
        from app.adapters.security.handlers import verify_password, hash_password
        from app.adapters.security.handlers import decode_token_func
        
        # Obtener el ID de quien hace la petición
        requester_id = None
        if credentials and credentials.credentials:
            try:
                token_data = decode_token_func(credentials.credentials)
                requester_id = str(token_data.get("sub"))
            except: pass

        # Si es un auto-update (el usuario cambia su propia clave), pedimos la anterior
        is_self_update = (requester_id == user_id)
        
        if is_self_update:
            if not payload.current_password:
                raise HTTPException(status_code=400, detail="Se requiere la contraseña actual para realizar el cambio.")
            
            if not verify_password(payload.current_password, lic.admin_password) and lic.admin_password != payload.current_password:
                raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta.")
        
        # Si es admin actualizando a otro, o pasó la validación de self-update:
        lic.admin_password = hash_password(payload.password)

    if payload.role is not None:
        lic.role = payload.role

    await uow.session.flush()
    
    await create_audit_log(
        uow=uow,
        category="USER",
        action=f"Actualización de perfil: {lic.recruiter_name}",
        entity_name="License",
        entity_id=user_id,
        agency_id=str(lic.agency_id)
    )
    
    await uow.session.commit()
    return ProfileUserOut(
        id=str(lic.id),
        username=lic.recruiter_name or "",
        email=lic.email or "",
        role=lic.role or "agency_admin",
        status="active",
        agency_id=str(lic.agency_id) if lic.agency_id else None,
    )


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    agency: Any = Depends(get_current_v2_agency),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    res = await uow.session.execute(
        select(LicenseORM).where(
            LicenseORM.id == user_id,
            LicenseORM.agency_id == str(agency.id)
        )
    )
    lic = res.scalar_one_or_none()
    if lic:
        await uow.session.delete(lic)
        await uow.session.flush()
        await uow.session.commit()
    return {"status": "ok"}
