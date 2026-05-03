from .auth import router as auth_v2_router
from .agencies import router as agencies_v2_router
from .licenses import router as licenses_v2_router
from .leads import router as leads_v2_router
from .tickets import router as tickets_v2_router
from .chat import router as chat_v2_router
from .overview import overview_router, dashboard_router
from .versions import router as versions_v2_router
from .users import router as users_v2_router
from .audit import router as audit_v2_router
from .notifications import router as notifications_v2_router

ROUTERS = [
    auth_v2_router,
    agencies_v2_router,
    licenses_v2_router,
    leads_v2_router,
    tickets_v2_router,
    chat_v2_router,
    overview_router,
    dashboard_router,
    versions_v2_router,
    users_v2_router,
    audit_v2_router,
    notifications_v2_router,
]
