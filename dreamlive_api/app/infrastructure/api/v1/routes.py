"""
Rutas v1: re-export de routers por feature.
Este archivo mantiene compatibilidad con imports existentes
pero delega la implementación a módulos individuales.
"""

from .licenses import licenses_router
from .agencies import agencies_router
from .leads import leads_router
from .versions import versions_router
from .overview import overview_router, dashboard_router
from .chat import router as chat_router
from .notifications import router as notifications_v1_router

__all__ = [
    "licenses_router",
    "agencies_router",
    "leads_router",
    "versions_router",
    "overview_router",
    "dashboard_router",
]

# Lista práctica para incluir routers desde `main.py`
ROUTERS = [
    licenses_router,
    agencies_router,
    leads_router,
    versions_router,
    overview_router,
    dashboard_router,
    chat_router,
    notifications_v1_router,
]
