from fastapi import APIRouter

# --- Extension Namespace ---
from .extension.auth import router as auth_ext
from .extension.licenses import router as licenses_ext
from .extension.leads import router as leads_ext
from .extension.chat import router as chat_ext
from .extension.notifications import router as notifications_ext
from .extension.operations import router as operations_ext

extension_router = APIRouter(prefix="/extension")
extension_router.include_router(auth_ext)
extension_router.include_router(licenses_ext)
extension_router.include_router(leads_ext)
extension_router.include_router(chat_ext)
extension_router.include_router(notifications_ext)
extension_router.include_router(operations_ext)

# --- Web Namespace ---
from .web.auth import router as auth_web
from .web.agencies import router as agencies_web
from .web.users import router as users_web
from .web.tickets import router as tickets_web
from .web.overview import overview_router, dashboard_router
from .web.notifications import router as notifications_web
from .web.versions import router as versions_web
from .web.audit import router as audit_web
from .web.leads import router as leads_web
from .web.licenses import router as licenses_web

# Placeholder for future routers (leads_web, licenses_web)
# We will create them soon.

web_router = APIRouter(prefix="/web")
web_router.include_router(auth_web)
web_router.include_router(agencies_web)
web_router.include_router(users_web)
web_router.include_router(tickets_web)
web_router.include_router(overview_router)
web_router.include_router(dashboard_router)
web_router.include_router(notifications_web)
web_router.include_router(versions_web)
web_router.include_router(audit_web)
web_router.include_router(leads_web)
web_router.include_router(licenses_web)
web_router.include_router(chat_ext) # Reuse chat logic

ROUTERS = [
    extension_router,
    web_router
]
