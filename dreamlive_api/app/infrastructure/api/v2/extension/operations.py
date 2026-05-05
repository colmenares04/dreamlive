from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from datetime import datetime, timezone, timedelta

from app.infrastructure.api.deps import get_uow
from app.infrastructure.api.v2.shared import get_current_v2_license
from app.adapters.db.models import LicenseORM

router = APIRouter(prefix="/operations", tags=["Operations Extension V2"])

@router.get("/limits")
async def get_limits(
    license: Any = Depends(get_current_v2_license),
    uow: Any = Depends(get_uow),
):
    # En V2, license ya es el objeto LicenseORM gracias a get_current_v2_license
    
    limit = license.request_limit or 60
    count = license.daily_contact_count or 0
    
    # Calcular tiempo para reinicio
    reset_in = 0
    if license.last_contact_date:
        refresh_m = license.refresh_minutes or 1440
        next_reset = license.last_contact_date + timedelta(minutes=refresh_m)
        now = datetime.now(timezone.utc)
        if next_reset > now:
            reset_in = int((next_reset - now).total_seconds())
            
    return {
        "allowed": count < limit,
        "count": count,
        "limit": limit,
        "reset_in": reset_in
    }
