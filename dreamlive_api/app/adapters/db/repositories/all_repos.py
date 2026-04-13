"""
Implementaciones concretas de los repositorios usando supabase-py sincrónico
ejecutado en thread pool para no bloquear el event loop de FastAPI.
"""
from typing import List, Optional, Tuple, Dict, Any
from supabase import Client
from datetime import datetime
import asyncio
from functools import partial

from app.core.entities.models import (
    Agency, License, LicenseStatus, Lead, LeadStatus, AppVersion,
    Ticket, AuditLog
)
from app.core.entities.user import User, UserRole
from app.core.ports.repositories import (
    IUserRepository, IAgencyRepository, ILicenseRepository,
    ILeadRepository, IAppVersionRepository, ITicketRepository, IAuditLogRepository
)


def _run(func, *args, **kwargs):
    """Ejecutar una función sincrónica en el event loop."""
    return asyncio.get_event_loop().run_in_executor(None, partial(func, *args, **kwargs))


# ═══════════════════════════════════════════════════════════════════════════════
# AGENCY REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class AgencyRepository(IAgencyRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> Agency:
        return Agency(
            id=row.get("id"),
            name=row.get("name", ""),
            logo_url=row.get("logo_url"),
            email=row.get("email"),
            password=row.get("password"),
        )

    def _fetch_by_id(self, agency_id: str):
        return self._db.table("agencies").select("*").eq("id", agency_id).execute()

    def _fetch_by_email(self, email: str):
        return self._db.table("agencies").select("*").eq("email", email).execute()

    def _fetch_all(self):
        return self._db.table("agencies").select("*").execute()

    def _insert(self, data: dict):
        return self._db.table("agencies").insert(data).execute()

    def _update(self, agency_id: str, data: dict):
        return self._db.table("agencies").update(data).eq("id", agency_id).execute()

    async def get_by_id(self, agency_id: str) -> Optional[Agency]:
        resp = await asyncio.to_thread(self._fetch_by_id, agency_id)
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_by_email(self, email: str) -> Optional[Agency]:
        resp = await asyncio.to_thread(self._fetch_by_email, email)
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, agency: Agency) -> Agency:
        data = {"name": agency.name, "logo_url": agency.logo_url,
                "email": agency.email, "password": agency.password}
        resp = await asyncio.to_thread(self._insert, data)
        return self._to_domain(resp.data[0])

    async def update(self, agency: Agency) -> Agency:
        data = {"name": agency.name, "logo_url": agency.logo_url,
                "email": agency.email, "password": agency.password}
        resp = await asyncio.to_thread(self._update, agency.id, data)
        return self._to_domain(resp.data[0])

    async def list_all(self) -> List[Agency]:
        resp = await asyncio.to_thread(self._fetch_all)
        return [self._to_domain(r) for r in resp.data]


# ═══════════════════════════════════════════════════════════════════════════════
# USER REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class UserRepository(IUserRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> User:
        return User(
            id=row.get("id"),
            email=row.get("email", ""),
            username=row.get("username", ""),
            role=UserRole(row.get("role", "agent")),
            agency_id=row.get("agency_id"),
            password_hash=row.get("password_hash"),
            status=row.get("status", "active"),
        )

    async def get_by_id(self, user_id: str) -> Optional[User]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("users").select("*").eq("id", user_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_by_email(self, email: str) -> Optional[User]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("users").select("*").eq("email", email).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, user: User) -> User:
        data = {
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "agency_id": user.agency_id,
            "password_hash": user.password_hash,
            "status": user.status.value,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("users").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, user: User) -> User:
        data = {
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "agency_id": user.agency_id,
            "status": user.status.value,
        }
        if user.password_hash is not None:
            data["password_hash"] = user.password_hash
        resp = await asyncio.to_thread(
            lambda: self._db.table("users").update(data).eq("id", user.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def list_all(self, agency_id: Optional[str] = None) -> List[User]:
        def _query():
            q = self._db.table("users").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.execute()
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]

    async def delete(self, user_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("users").delete().eq("id", user_id).execute()
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TICKET REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class TicketRepository(ITicketRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> Ticket:
        return Ticket(
            id=row.get("id"),
            agency_id=row.get("agency_id", ""),
            assigned_to_user_id=row.get("assigned_to_user_id"),
            subject=row.get("subject", ""),
            description=row.get("description", ""),
            status=row.get("status", "open"),
            priority=row.get("priority", "medium"),
            created_at=datetime.fromisoformat(row.get("created_at").replace("Z", "+00:00")) if row.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(row.get("updated_at").replace("Z", "+00:00")) if row.get("updated_at") else datetime.utcnow(),
            closed_at=datetime.fromisoformat(row.get("closed_at").replace("Z", "+00:00")) if row.get("closed_at") else None,
        )

    async def get_by_id(self, ticket_id: str) -> Optional[Ticket]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("tickets").select("*").eq("id", ticket_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def list_all(self, agency_id: Optional[str] = None) -> List[Ticket]:
        def _query():
            q = self._db.table("tickets").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.execute()
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]

    async def create(self, ticket: Ticket) -> Ticket:
        data = {
            "agency_id": ticket.agency_id,
            "assigned_to_user_id": ticket.assigned_to_user_id,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("tickets").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, ticket: Ticket) -> Ticket:
        data = {
            "assigned_to_user_id": ticket.assigned_to_user_id,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "closed_at": ticket.closed_at.isoformat() if ticket.closed_at else None,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("tickets").update(data).eq("id", ticket.id).execute()
        )
        return self._to_domain(resp.data[0])


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class AuditLogRepository(IAuditLogRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> AuditLog:
        return AuditLog(
            id=row.get("id"),
            user_id=row.get("user_id"),
            agency_id=row.get("agency_id"),
            category=row.get("category", ""),
            action=row.get("action", ""),
            entity_name=row.get("entity_name"),
            entity_id=row.get("entity_id"),
            old_data=row.get("old_data"),
            new_data=row.get("new_data"),
            ip_address=row.get("ip_address"),
            created_at=datetime.fromisoformat(row.get("created_at").replace("Z", "+00:00")) if row.get("created_at") else datetime.utcnow(),
        )

    async def list_all(self, agency_id: Optional[str] = None) -> List[AuditLog]:
        def _query():
            q = self._db.table("audit_logs").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.order("created_at", desc=True).execute()
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]

    async def create(self, log: AuditLog) -> AuditLog:
        data = {
            "user_id": log.user_id,
            "agency_id": log.agency_id,
            "category": log.category,
            "action": log.action,
            "entity_name": log.entity_name,
            "entity_id": log.entity_id,
            "old_data": log.old_data,
            "new_data": log.new_data,
            "ip_address": log.ip_address,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("audit_logs").insert(data).execute()
        )
        return self._to_domain(resp.data[0])


# ═══════════════════════════════════════════════════════════════════════════════
# LICENSE REPOSITORY
class LicenseRepository(ILicenseRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> License:
        expires_str = row.get("expiration_date")
        expires_at = datetime.fromisoformat(expires_str.replace("Z", "+00:00")) if expires_str else None
        return License(
            id=row.get("id"),
            agency_id=row.get("agency_id", ""),
            license_key=row.get("license_key", ""),
            email=row.get("email"),
            is_active=row.get("is_active", True),
            max_devices=row.get("max_devices", 1),
            expiration_date=expires_at,
            keywords=row.get("keywords", ""),
            message_templates=row.get("message_templates") or [],
            recruiter_name=row.get("recruiter_name", ""),
            limit_requests=row.get("limit_requests", 60),
            refresh_minutes=row.get("refresh_minutes", 720),
            admin_password=row.get("admin_password", "admin123"),
            invitation_types=row.get("invitation_types") or [],
        )

    async def get_by_id(self, license_id: str) -> Optional[License]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").select("*").eq("id", license_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_by_key(self, key: str) -> Optional[License]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").select("*").eq("license_key", key).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, license_: License) -> License:
        data = {
            "agency_id": license_.agency_id,
            "license_key": license_.license_key,
            "email": license_.email,
            "is_active": license_.is_active,
            "max_devices": license_.max_devices,
            "expiration_date": license_.expiration_date.isoformat() if license_.expiration_date else None,
            "keywords": license_.keywords,
            "message_templates": license_.message_templates,
            "recruiter_name": license_.recruiter_name,
            "limit_requests": license_.limit_requests,
            "refresh_minutes": license_.refresh_minutes,
            "admin_password": license_.admin_password,
            "invitation_types": license_.invitation_types,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, license_: License) -> License:
        data = {
            "email": license_.email,
            "is_active": license_.is_active,
            "max_devices": license_.max_devices,
            "expiration_date": license_.expiration_date.isoformat() if license_.expiration_date else None,
            "keywords": license_.keywords,
            "message_templates": license_.message_templates,
            "recruiter_name": license_.recruiter_name,
            "limit_requests": license_.limit_requests,
            "refresh_minutes": license_.refresh_minutes,
            "admin_password": license_.admin_password,
            "invitation_types": license_.invitation_types,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").update(data).eq("id", license_.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def list_all(self, is_active: Optional[bool] = None, agency_id: Optional[str] = None) -> List[License]:
        def _query():
            q = self._db.table("licenses").select("*")
            if is_active is not None:
                q = q.eq("is_active", is_active)
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.execute()
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class LeadRepository(ILeadRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> Lead:
        return Lead(
            id=row.get("id"),
            license_id=row.get("license_id", ""),
            username=row.get("username", ""),
            status=LeadStatus(row.get("status", "recopilado")),
            viewer_count=row.get("viewer_count", 0),
            source=row.get("source", "unknown"),
            likes_count=row.get("likes_count", 0),
        )

    async def get_by_id(self, lead_id: str) -> Optional[Lead]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads").select("*").eq("id", lead_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, lead: Lead) -> Lead:
        data = {"license_id": lead.license_id, "username": lead.username,
                "status": lead.status.value, "viewer_count": lead.viewer_count,
                "source": lead.source, "likes_count": lead.likes_count}
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, lead: Lead) -> Lead:
        data = {"status": lead.status.value, "viewer_count": lead.viewer_count,
                "likes_count": lead.likes_count}
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads").update(data).eq("id", lead.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def list_paginated(self, license_id: str, page: int = 1, page_size: int = 50,
                              status: Optional[LeadStatus] = None) -> Tuple[List[Lead], int]:
        def _query():
            q = self._db.table("tiktok_leads").select("*", count="exact").eq("license_id", license_id)
            if status:
                q = q.eq("status", status.value)
            start = (page - 1) * page_size
            return q.range(start, start + page_size - 1).execute()
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data], resp.count or 0

    async def count_by_status(self, license_id: str) -> dict:
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads").select("status").eq("license_id", license_id).execute()
        )
        counts: dict = {}
        for row in resp.data:
            s = row.get("status")
            counts[s] = counts.get(s, 0) + 1
        return counts


# ═══════════════════════════════════════════════════════════════════════════════
# APP VERSION REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class AppVersionRepository(IAppVersionRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> AppVersion:
        return AppVersion(
            id=row.get("id"),
            version_number=row.get("version_number", ""),
            changelog=row.get("changelog", ""),
            is_active=row.get("is_active", True),
            file_url=row.get("file_url", ""),
            file_size_kb=row.get("file_size_kb", 0),
            tags=row.get("tags") or [],
            platform=row.get("platform", "windows"),
        )

    async def get_by_id(self, version_id: str) -> Optional[AppVersion]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").select("*").eq("id", version_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_latest_active(self, platform: str) -> Optional[AppVersion]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").select("*")
                .eq("platform", platform).eq("is_active", True)
                .order("release_date", desc=True).limit(1).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, version: AppVersion) -> AppVersion:
        data = {"version_number": version.version_number, "changelog": version.changelog,
                "is_active": version.is_active, "file_url": version.file_url,
                "file_size_kb": version.file_size_kb, "tags": version.tags, "platform": version.platform}
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def delete(self, version_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("app_versions").delete().eq("id", version_id).execute()
        )

    async def list_all(self) -> List[AppVersion]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("app_versions").select("*").order("release_date", desc=True).execute()
        )
        return [self._to_domain(r) for r in resp.data]
