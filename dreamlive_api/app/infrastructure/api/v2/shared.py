from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Any
from app.infrastructure.api.deps import get_uow
from app.adapters.security.handlers import decode_token_func

bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_v2_agency(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import AgencyORM, LicenseORM
    
    if not credentials or not credentials.credentials:
        # Fallback para desarrollo: devuelve la primera agencia si no hay auth
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        if not agency:
            raise HTTPException(status_code=401, detail="No agency available in the DB.")
        return agency

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        # 1. ¿Es un ID de agencia?
        res = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == subject_id))
        agency = res.scalar_one_or_none()
        if agency:
            return agency
            
        # 2. ¿Es un ID de licencia?
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if lic and lic.agency_id:
            res_agency = await uow.session.execute(select(AgencyORM).where(AgencyORM.id == str(lic.agency_id)))
            agency = res_agency.scalar_one_or_none()
            if agency:
                return agency
                
        # 3. Fallback (para compatibilidad en migraciones)
        res = await uow.session.execute(select(AgencyORM))
        agency = res.scalars().first()
        return agency
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado.")

async def get_current_v2_license(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    from app.adapters.db.models import LicenseORM
    
    if not credentials or not credentials.credentials:
        # Fallback para desarrollo: devuelve la primera licencia si no hay auth
        res = await uow.session.execute(select(LicenseORM))
        lic = res.scalars().first()
        if not lic:
            raise HTTPException(status_code=401, detail="No license available in the DB.")
        return lic

    try:
        payload = decode_token_func(credentials.credentials)
        subject_id = str(payload["sub"])
        
        # ¿Es un ID de licencia?
        res_lic = await uow.session.execute(select(LicenseORM).where(LicenseORM.id == subject_id))
        lic = res_lic.scalar_one_or_none()
        if lic:
            # Lógica de reseteo diario
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            
            # Si hay una fecha de contacto y ha pasado más de 24 horas O es un día diferente
            # Aquí usaremos la lógica de refresh_minutes
            if lic.last_contact_date:
                refresh_m = lic.refresh_minutes or 1440
                if now > (lic.last_contact_date + timedelta(minutes=refresh_m)):
                    lic.daily_contact_count = 0
                    uow.session.add(lic)
                    await uow.session.flush()
            
            return lic
                
        raise HTTPException(status_code=401, detail="El token no corresponde a una licencia válida.")
    except Exception:
        raise HTTPException(status_code=401, detail="Token de licencia inválido o expirado.")
