"""
Rutas relacionadas con Licencias — Controladores "tontos".
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.application.licenses.use_cases import (
    CreateLicenseUseCase, ExtendLicenseUseCase,
    ToggleLicenseUseCase, ListLicensesUseCase,
    VerifyLicenseUseCase, UpdateLicenseConfigUseCase,
    SyncLicensePasswordsUseCase, UpdateLicenseDateUseCase,
    DeleteLicenseUseCase, RegisterSessionUseCase,
)
from app.infrastructure.api.deps import AuthUser, UserRole, get_db
from app.infrastructure.api.deps import (
    get_current_user,
    require_admin,
    require_agency_group,
)
from app.infrastructure.api.providers import (
    get_create_license_use_case,
    get_extend_license_use_case,
    get_toggle_license_use_case,
    get_list_licenses_use_case,
    get_verify_license_use_case,
    get_update_license_config_use_case,
    get_sync_license_passwords_use_case,
    get_update_license_date_use_case,
    get_delete_license_use_case,
    get_register_session_use_case,
    get_license_performance_use_case,
)
from app.application.leads.use_cases import GetLicensePerformanceUseCase


licenses_router = APIRouter(prefix="/licenses", tags=["Licenses"])


class LicenseOut(BaseModel):
    id: str | None
    key: str
    agency_id: str | None
    recruiter_name: str
    status: str
    request_limit: int
    refresh_minutes: int
    expires_at: str | None
    days_remaining: int
    admin_password: str
    keywords: str


class CreateLicenseBody(BaseModel):
    agency_id: str
    recruiter_name: str
    days: int
    request_limit: int = 60
    refresh_minutes: int = 1


class ExtendLicenseBody(BaseModel):
    days: int


@licenses_router.get("/")
async def list_licenses(
    status_filter: Optional[str] = Query(None, alias="status"),
    agency_id: Optional[str] = None,
    current_user: AuthUser = Depends(get_current_user),
    use_case: ListLicensesUseCase = Depends(get_list_licenses_use_case),
):
    if current_user.role.value != "superuser":
        agency_id = str(current_user.agency_id)

    licenses = await use_case.execute(status=status_filter, agency_id=agency_id)
    return [
        LicenseOut(
            id=l.id, key=l.license_key, agency_id=l.agency_id,
            recruiter_name=l.recruiter_name, status="active" if l.is_active else "inactive",
            request_limit=l.limit_requests, refresh_minutes=l.refresh_minutes,
            expires_at=l.expiration_date.isoformat() if l.expiration_date else None,
            days_remaining=0, admin_password=l.admin_password, keywords=l.keywords,
        ) for l in licenses
    ]


@licenses_router.get("/metrics", dependencies=[Depends(require_agency_group)])
async def get_license_metrics(
    agency_id: Optional[str] = Query(None),
    current_user: AuthUser = Depends(get_current_user),
    use_case: GetLicensePerformanceUseCase = Depends(get_license_performance_use_case),
):
    if current_user.role != UserRole.SUPERUSER:
        agency_id = str(current_user.agency_id) if current_user.agency_id else None

    return await use_case.execute(agency_id=agency_id)


@licenses_router.post("/", status_code=201, dependencies=[Depends(require_admin)])
async def create_license(
    body: CreateLicenseBody,
    use_case: CreateLicenseUseCase = Depends(get_create_license_use_case),
):
    lic = await use_case.execute(
        agency_id=body.agency_id, recruiter_name=body.recruiter_name,
        days=body.days, request_limit=body.request_limit,
        refresh_minutes=body.refresh_minutes,
    )
    return {"id": lic.id, "key": lic.license_key, "expires_at": lic.expiration_date.isoformat() if lic.expiration_date else None}


@licenses_router.patch("/{license_id}/extend", dependencies=[Depends(require_admin)])
async def extend_license(
    license_id: str,
    body: ExtendLicenseBody,
    use_case: ExtendLicenseUseCase = Depends(get_extend_license_use_case),
):
    lic = await use_case.execute(license_id, body.days)
    return {"expires_at": lic.expiration_date.isoformat() if lic.expiration_date else None}


@licenses_router.patch("/{license_id}/toggle", dependencies=[Depends(require_admin)])
async def toggle_license(
    license_id: str,
    use_case: ToggleLicenseUseCase = Depends(get_toggle_license_use_case),
):
    lic = await use_case.execute(license_id)
    return {"is_active": lic.is_active}


class ConfigLicenseBody(BaseModel):
    recruiter_name: Optional[str] = None
    admin_password: Optional[str] = None
    request_limit: Optional[int] = None
    refresh_minutes: Optional[int] = None
    keywords: Optional[str] = None
    message_templates: Optional[List[str]] = None
    invitation_types: Optional[List[str]] = None


@licenses_router.patch("/{license_id}/config", dependencies=[Depends(require_agency_group)])
async def config_license(
    license_id: str,
    body: ConfigLicenseBody,
    current_user: AuthUser = Depends(get_current_user),
    use_case: UpdateLicenseConfigUseCase = Depends(get_update_license_config_use_case),
):
    # El Use Case debe manejar la lógica de negocio y seguridad (o el router delega la verificación)
    # Por simplicidad y siguiendo la regla de "Dumb Controller", delegamos al Use Case.
    await use_case.execute(
        license_id=license_id,
        recruiter_name=body.recruiter_name,
        admin_password=body.admin_password,
        request_limit=body.request_limit,
        refresh_minutes=body.refresh_minutes,
        keywords=body.keywords,
        message_templates=body.message_templates,
        invitation_types=body.invitation_types,
    )
    return {"status": "ok"}


@licenses_router.get("/templates", dependencies=[Depends(require_agency_group)])
async def get_license_templates(
    current_user: AuthUser = Depends(get_current_user),
    db = Depends(get_db),
):
    print(f"🔍 [GET /templates] User ID: {current_user.id}, License ID: {current_user.license_id}")
    if not current_user.license_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Solo las licencias pueden tener plantillas.")

    from app.adapters.db.repositories.license_repository import LicenseRepository
    repo = LicenseRepository(db)
    lic_obj = await repo.get_by_id(current_user.id)
    
    if not lic_obj:
        print(f"❌ [GET /templates] Licencia no encontrada para ID: {current_user.id}")
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")

    print(f"✅ [GET /templates] Enviando tags: {lic_obj.invitation_types}")
    return {
        "message_templates": lic_obj.message_templates,
        "invitation_types": lic_obj.invitation_types
    }


@licenses_router.post("/templates", dependencies=[Depends(require_agency_group)])
async def update_license_templates(
    body: ConfigLicenseBody,
    current_user: AuthUser = Depends(get_current_user),
    use_case: UpdateLicenseConfigUseCase = Depends(get_update_license_config_use_case),
):
    print(f"📥 [POST /templates] Recibiendo tags: {body.invitation_types} para ID: {current_user.id}")
    if not current_user.license_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Solo las licencias pueden actualizar plantillas.")

    await use_case.execute(
        license_id=current_user.id,
        message_templates=body.message_templates,
        invitation_types=body.invitation_types,
    )
    print(f"✅ [POST /templates] Guardado exitoso.")
    return {"status": "ok"}


class SyncPasswordsBody(BaseModel):
    password: str


@licenses_router.post("/sync-passwords", dependencies=[Depends(require_agency_group)])
async def sync_passwords(
    body: SyncPasswordsBody,
    current_user: AuthUser = Depends(get_current_user),
    use_case: SyncLicensePasswordsUseCase = Depends(get_sync_license_passwords_use_case),
):
    if not current_user.agency_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="User has no agency associated.")

    updated_count = await use_case.execute(str(current_user.agency_id), body.password)
    return {"status": "ok", "updated_count": updated_count}


class UpdateLicenseDateBody(BaseModel):
    new_date: str


@licenses_router.patch("/{license_id}/date", dependencies=[Depends(require_admin)])
async def update_license_date(
    license_id: str,
    body: UpdateLicenseDateBody,
    use_case: UpdateLicenseDateUseCase = Depends(get_update_license_date_use_case),
):
    try:
        dt = datetime.fromisoformat(body.new_date.replace("Z", "+00:00"))
        await use_case.execute(license_id, dt)
        return {"status": "ok"}
    except ValueError:
        from app.core.domain.exceptions import ValidationError
        raise ValidationError("Formato de fecha inválido. Use formato ISO.")


class DeleteLicenseBody(BaseModel):
    password: Optional[str] = None


@licenses_router.delete("/{license_id}", dependencies=[Depends(require_admin)])
async def delete_license(
    license_id: str,
    body: Optional[DeleteLicenseBody] = None,
    use_case: DeleteLicenseUseCase = Depends(get_delete_license_use_case),
):
    await use_case.execute(license_id)
    return {"status": "ok"}


class VerifyLicenseBody(BaseModel):
    key: str


@licenses_router.post("/verify")
async def verify_license(
    body: VerifyLicenseBody,
    use_case: VerifyLicenseUseCase = Depends(get_verify_license_use_case),
):
    license_ = await use_case.execute(body.key)
    if not license_:
        from app.core.domain.exceptions import LicenseInactive
        raise LicenseInactive()

    return {
        "id": license_.id,
        "key": license_.license_key,
        "is_active": license_.is_active,
        "expiration_date": license_.expiration_date.isoformat() if license_.expiration_date else None,
        "recruiter_name": license_.recruiter_name,
        "limit_requests": license_.limit_requests,
        "refresh_minutes": license_.refresh_minutes,
        "max_devices": license_.max_devices,
        "theme": license_.theme,
    }


class RegisterSessionBody(BaseModel):
    license_id: str
    device_id: str
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None


@licenses_router.post("/session")
async def register_session(
    body: RegisterSessionBody,
    use_case: RegisterSessionUseCase = Depends(get_register_session_use_case),
):
    success = await use_case.execute(
        license_id=body.license_id,
        device_id=body.device_id,
        browser_name=body.browser,
        os_name=body.os,
        ip_address=body.ip_address
    )
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No se pudo registrar la sesión. Verifique que la licencia esté activa.")
    return {"status": "ok"}
