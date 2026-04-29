"""
Inyección de dependencias para los Casos de Uso.

Centraliza la instanciación de Use Cases inyectando el Unit of Work compartido y otros servicios.
"""
from fastapi import Depends

from app.core.ports.unit_of_work import IUnitOfWork
from app.infrastructure.api.deps import get_uow

# ── Servivios de Seguridad & Caché (Singletons) ───────────────────────────────
from app.adapters.security.handlers import JWTHandler, PasswordHandler
from app.infrastructure.cache.redis_cache import cache_service
from app.core.ports.cache import ICacheService

_token_service = JWTHandler()
_password_hasher = PasswordHandler()

def get_token_service(): return _token_service
def get_password_hasher(): return _password_hasher
def get_cache_service() -> ICacheService: return cache_service


# ── Auth Use Cases ────────────────────────────────────────────────────────────
from app.application.auth.use_cases import (
    LoginUseCase,
    SelectProfileUseCase,
    CreateUserUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
    ListAgencyUsersUseCase,
)

# ── License & Agency Use Cases ────────────────────────────────────────────────
from app.application.licenses.use_cases import (
    CreateLicenseUseCase,
    ExtendLicenseUseCase,
    ToggleLicenseUseCase,
    ListLicensesUseCase,
    VerifyLicenseUseCase,
    UpdateLicenseConfigUseCase,
    SyncLicensePasswordsUseCase,
    UpdateLicenseDateUseCase,
    DeleteLicenseUseCase,
    CreateAgencyUseCase,
    ListAgenciesUseCase,
    DeleteAgencyUseCase,
    GetAgencyStatsUseCase,
    GetAgencyPermissionsUseCase,
    UpdateAgencyPermissionsUseCase,
    PublishVersionUseCase,
    ActivateVersionUseCase,
    DeleteVersionUseCase,
    ListVersionsUseCase,
    RegisterSessionUseCase,
)

# ── Lead & Overview Use Cases ─────────────────────────────────────────────────
from app.application.leads.use_cases import (
    ListLeadsUseCase,
    PurgeLeadsUseCase,
    SaveLeadUseCase,
    UpdateLeadStatusUseCase,
    GetAdminOverviewUseCase,
    GetAgencyDashboardUseCase,
    GetLicensePerformanceUseCase,
)

# ── User, Ticket & Audit Use Cases ────────────────────────────────────────────
from app.application.users.use_cases import (
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    InviteUserUseCase,
    ListTicketsUseCase,
    CreateTicketUseCase,
    UpdateTicketStatusUseCase,
    DeleteTicketUseCase,
    ListAuditLogsUseCase,
    CreateAuditLogUseCase,
)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_login_use_case(uow: IUnitOfWork = Depends(get_uow)) -> LoginUseCase:
    return LoginUseCase(uow=uow, token_service=_token_service)

async def get_select_profile_use_case(uow: IUnitOfWork = Depends(get_uow)) -> SelectProfileUseCase:
    return SelectProfileUseCase(uow=uow, token_service=_token_service, password_hasher=_password_hasher)

async def get_create_user_use_case(uow: IUnitOfWork = Depends(get_uow)) -> CreateUserUseCase:
    return CreateUserUseCase(uow=uow, password_hasher=_password_hasher)

async def get_refresh_token_use_case(uow: IUnitOfWork = Depends(get_uow)) -> RefreshTokenUseCase:
    return RefreshTokenUseCase(uow=uow, token_service=_token_service)

async def get_profile_use_case(uow: IUnitOfWork = Depends(get_uow)) -> GetProfileUseCase:
    return GetProfileUseCase(uow=uow, token_service=_token_service)

async def get_list_agency_users_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListAgencyUsersUseCase:
    return ListAgencyUsersUseCase(uow=uow)


# ═══════════════════════════════════════════════════════════════════════════════
# LICENSE PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_create_license_use_case(uow: IUnitOfWork = Depends(get_uow)) -> CreateLicenseUseCase:
    return CreateLicenseUseCase(uow=uow)

async def get_extend_license_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ExtendLicenseUseCase:
    return ExtendLicenseUseCase(uow=uow)

async def get_toggle_license_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ToggleLicenseUseCase:
    return ToggleLicenseUseCase(uow=uow)

async def get_list_licenses_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListLicensesUseCase:
    return ListLicensesUseCase(uow=uow)

async def get_verify_license_use_case(uow: IUnitOfWork = Depends(get_uow)) -> VerifyLicenseUseCase:
    return VerifyLicenseUseCase(uow=uow)

async def get_update_license_config_use_case(uow: IUnitOfWork = Depends(get_uow)) -> UpdateLicenseConfigUseCase:
    return UpdateLicenseConfigUseCase(uow=uow)

async def get_sync_license_passwords_use_case(uow: IUnitOfWork = Depends(get_uow)) -> SyncLicensePasswordsUseCase:
    return SyncLicensePasswordsUseCase(uow=uow)

async def get_update_license_date_use_case(uow: IUnitOfWork = Depends(get_uow)) -> UpdateLicenseDateUseCase:
    return UpdateLicenseDateUseCase(uow=uow)

async def get_delete_license_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteLicenseUseCase:
    return DeleteLicenseUseCase(uow=uow)

async def get_register_session_use_case(uow: IUnitOfWork = Depends(get_uow)) -> RegisterSessionUseCase:
    return RegisterSessionUseCase(uow=uow)


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCY PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_create_agency_use_case(uow: IUnitOfWork = Depends(get_uow)) -> CreateAgencyUseCase:
    return CreateAgencyUseCase(uow=uow)

async def get_list_agencies_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListAgenciesUseCase:
    return ListAgenciesUseCase(uow=uow)

async def get_delete_agency_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteAgencyUseCase:
    return DeleteAgencyUseCase(uow=uow, password_hasher=_password_hasher)

async def get_agency_stats_use_case(uow: IUnitOfWork = Depends(get_uow)) -> GetAgencyStatsUseCase:
    return GetAgencyStatsUseCase(uow=uow)

async def get_get_agency_permissions_use_case(uow: IUnitOfWork = Depends(get_uow)) -> GetAgencyPermissionsUseCase:
    return GetAgencyPermissionsUseCase(uow=uow)

async def get_update_agency_permissions_use_case(uow: IUnitOfWork = Depends(get_uow)) -> UpdateAgencyPermissionsUseCase:
    return UpdateAgencyPermissionsUseCase(uow=uow)


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD & OVERVIEW PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_list_leads_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListLeadsUseCase:
    return ListLeadsUseCase(uow=uow)

async def get_purge_leads_use_case(uow: IUnitOfWork = Depends(get_uow)) -> PurgeLeadsUseCase:
    return PurgeLeadsUseCase(uow=uow)

async def get_save_lead_use_case(uow: IUnitOfWork = Depends(get_uow)) -> SaveLeadUseCase:
    return SaveLeadUseCase(uow=uow)

async def get_update_lead_status_use_case(uow: IUnitOfWork = Depends(get_uow)) -> UpdateLeadStatusUseCase:
    return UpdateLeadStatusUseCase(uow=uow)

async def get_admin_overview_use_case(
    uow: IUnitOfWork = Depends(get_uow),
    cache: ICacheService = Depends(get_cache_service)
) -> GetAdminOverviewUseCase:
    return GetAdminOverviewUseCase(uow=uow, cache_service=cache)

async def get_agency_dashboard_use_case(
    uow: IUnitOfWork = Depends(get_uow),
    cache: ICacheService = Depends(get_cache_service)
) -> GetAgencyDashboardUseCase:
    return GetAgencyDashboardUseCase(uow=uow, cache_service=cache)

async def get_license_performance_use_case(uow: IUnitOfWork = Depends(get_uow)) -> GetLicensePerformanceUseCase:
    return GetLicensePerformanceUseCase(uow=uow)


# ═══════════════════════════════════════════════════════════════════════════════
# USER, TICKET & AUDIT PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_list_users_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListUsersUseCase:
    return ListUsersUseCase(uow=uow)

async def get_update_user_use_case(uow: IUnitOfWork = Depends(get_uow)) -> UpdateUserUseCase:
    return UpdateUserUseCase(uow=uow, password_hasher=_password_hasher)

async def get_delete_user_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteUserUseCase:
    return DeleteUserUseCase(uow=uow)

async def get_invite_user_use_case(uow: IUnitOfWork = Depends(get_uow)) -> InviteUserUseCase:
    return InviteUserUseCase(uow=uow)

async def get_list_tickets_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListTicketsUseCase:
    return ListTicketsUseCase(uow=uow)

async def get_create_ticket_use_case(uow: IUnitOfWork = Depends(get_uow)) -> CreateTicketUseCase:
    return CreateTicketUseCase(uow=uow)

async def get_update_ticket_status_use_case(uow: IUnitOfWork = Depends(get_uow)) -> UpdateTicketStatusUseCase:
    return UpdateTicketStatusUseCase(uow=uow)

async def get_delete_ticket_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteTicketUseCase:
    return DeleteTicketUseCase(uow=uow)

async def get_list_audit_logs_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListAuditLogsUseCase:
    return ListAuditLogsUseCase(uow=uow)

async def get_create_audit_log_use_case(uow: IUnitOfWork = Depends(get_uow)) -> CreateAuditLogUseCase:
    return CreateAuditLogUseCase(uow=uow)


# ═══════════════════════════════════════════════════════════════════════════════
# VERSION PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_publish_version_use_case(uow: IUnitOfWork = Depends(get_uow)) -> PublishVersionUseCase:
    return PublishVersionUseCase(uow=uow)

async def get_activate_version_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ActivateVersionUseCase:
    return ActivateVersionUseCase(uow=uow)

async def get_delete_version_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteVersionUseCase:
    return DeleteVersionUseCase(uow=uow)

async def get_list_versions_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListVersionsUseCase:
    return ListVersionsUseCase(uow=uow)
