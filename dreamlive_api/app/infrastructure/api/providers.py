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
from app.core.ports.realtime import IRealTimeGateway
from app.infrastructure.api.v2.socket_manager import socket_manager

_token_service = JWTHandler()
_password_hasher = PasswordHandler()

def get_token_service(): return _token_service
def get_password_hasher(): return _password_hasher
def get_cache_service() -> ICacheService: return cache_service
def get_realtime_gateway() -> IRealTimeGateway: return socket_manager


# ── Auth Use Cases ────────────────────────────────────────────────────────────
from app.application.auth.use_cases import (
    LoginUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
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
    LinkLicenseUseCase,
    LoginExtensionUseCase,
)

# ── Lead & Overview Use Cases ─────────────────────────────────────────────────
from app.application.leads.use_cases import (
    ListLeadsUseCase,
    PurgeLeadsUseCase,
    PurgeLeadsByStatusUseCase,
    SaveLeadUseCase,
    UpdateLeadStatusUseCase,
    DeleteLeadUseCase,
    GetAdminOverviewUseCase,
    GetAgencyDashboardUseCase,
    GetLicensePerformanceUseCase,
    ProcessBatchLeadsUseCase,
)
from app.application.leads.keywords_use_cases import (
    ListKeywordsUseCase,
    AddKeywordUseCase,
    RemoveKeywordUseCase,
)

# ── User, Ticket & Audit Use Cases ────────────────────────────────────────────
from app.application.users.use_cases import (
    ListTicketsUseCase,
    CreateTicketUseCase,
    UpdateTicketStatusUseCase,
    DeleteTicketUseCase,
    ListAuditLogsUseCase,
    CreateAuditLogUseCase,
)
from app.application.tickets.use_cases import (
    SaveChatMessageUseCase,
    ListChatMessagesUseCase,
)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_login_use_case(uow: IUnitOfWork = Depends(get_uow)) -> LoginUseCase:
    return LoginUseCase(uow=uow, token_service=_token_service, password_hasher=_password_hasher)


async def get_refresh_token_use_case(uow: IUnitOfWork = Depends(get_uow)) -> RefreshTokenUseCase:
    return RefreshTokenUseCase(uow=uow, token_service=_token_service)

async def get_profile_use_case(uow: IUnitOfWork = Depends(get_uow)) -> GetProfileUseCase:
    return GetProfileUseCase(uow=uow, token_service=_token_service)


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

async def get_register_session_use_case(
    uow: IUnitOfWork = Depends(get_uow),
    cache: ICacheService = Depends(get_cache_service),
    gateway: IRealTimeGateway = Depends(get_realtime_gateway)
) -> RegisterSessionUseCase:
    return RegisterSessionUseCase(uow=uow, cache=cache, gateway=gateway)

async def get_link_license_use_case(uow: IUnitOfWork = Depends(get_uow)) -> LinkLicenseUseCase:
    return LinkLicenseUseCase(uow=uow)

async def get_login_extension_use_case(uow: IUnitOfWork = Depends(get_uow)) -> LoginExtensionUseCase:
    return LoginExtensionUseCase(uow=uow)

# ═══════════════════════════════════════════════════════════════════════════════
# AGENCY PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_create_agency_use_case(uow: IUnitOfWork = Depends(get_uow)) -> CreateAgencyUseCase:
    return CreateAgencyUseCase(uow=uow)

async def get_list_agencies_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListAgenciesUseCase:
    return ListAgenciesUseCase(uow=uow)

async def get_delete_agency_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteAgencyUseCase:
    return DeleteAgencyUseCase(uow=uow)

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

async def get_delete_lead_use_case(uow: IUnitOfWork = Depends(get_uow)) -> DeleteLeadUseCase:
    return DeleteLeadUseCase(uow=uow)

async def get_process_batch_leads_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ProcessBatchLeadsUseCase:
    return ProcessBatchLeadsUseCase(uow=uow)

async def get_purge_leads_by_status_use_case(uow: IUnitOfWork = Depends(get_uow)) -> PurgeLeadsByStatusUseCase:
    return PurgeLeadsByStatusUseCase(uow=uow)

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

async def get_list_keywords_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListKeywordsUseCase:
    return ListKeywordsUseCase(uow=uow)

async def get_add_keyword_use_case(uow: IUnitOfWork = Depends(get_uow)) -> AddKeywordUseCase:
    return AddKeywordUseCase(uow=uow)

async def get_remove_keyword_use_case(uow: IUnitOfWork = Depends(get_uow)) -> RemoveKeywordUseCase:
    return RemoveKeywordUseCase(uow=uow)


# ═══════════════════════════════════════════════════════════════════════════════
# USER, TICKET & AUDIT PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════


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
# CHAT PROVIDERS
# ═══════════════════════════════════════════════════════════════════════════════
async def get_save_chat_message_use_case(uow: IUnitOfWork = Depends(get_uow)) -> SaveChatMessageUseCase:
    return SaveChatMessageUseCase(uow=uow)

async def get_list_chat_messages_use_case(uow: IUnitOfWork = Depends(get_uow)) -> ListChatMessagesUseCase:
    return ListChatMessagesUseCase(uow=uow)


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
