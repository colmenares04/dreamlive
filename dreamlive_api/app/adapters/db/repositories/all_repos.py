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
    Ticket, TicketMessage, AuditLog
)
, UserStatus
from app.core.ports.repositories import (
    IUserRepository, IAgencyRepository, ILicenseRepository,
    ILeadRepository, IAppVersionRepository, ITicketRepository, 
    ITicketMessageRepository, IAuditLogRepository
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
            role_permissions=row.get("role_permissions", {}),
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
        data = {
            "name": agency.name, 
            "logo_url": agency.logo_url,
            "email": agency.email, 
            "password": agency.password,
            "role_permissions": agency.role_permissions
        }
        resp = await asyncio.to_thread(self._insert, data)
        return self._to_domain(resp.data[0])

    async def update(self, agency: Agency) -> Agency:
        data = {
            "name": agency.name, 
            "logo_url": agency.logo_url,
            "email": agency.email, 
            "password": agency.password,
            "role_permissions": agency.role_permissions
        }
        resp = await asyncio.to_thread(self._update, agency.id, data)
        return self._to_domain(resp.data[0])

    async def list_all(self) -> List[Agency]:
        resp = await asyncio.to_thread(self._fetch_all)
        return [self._to_domain(r) for r in resp.data]

    async def delete(self, agency_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("agencies").delete().eq("id", agency_id).execute()
        )


# ═══════════════════════════════════════════════════════════════════════════════
# USER REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class UserRepository(IUserRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> User:
        username = row.get("first_name", "")
        if row.get("last_name"):
            username += " " + row.get("last_name")

        return User(
            id=row.get("id"),
            email=row.get("email", ""),
            username=username.strip(),
            role=UserRole(row.get("role", "agent")),
            agency_id=row.get("agency_id"),
            password_hash=row.get("password_hash"),
            status=UserStatus.ACTIVE if row.get("is_active", True) else UserStatus.INACTIVE,
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
        parts = user.username.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        data = {
            "email": user.email,
            "first_name": first_name,
            "last_name": last_name,
            "role": user.role.value,
            "agency_id": user.agency_id,
            "password_hash": user.password_hash,
            "is_active": user.status == UserStatus.ACTIVE,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("users").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, user: User) -> User:
        parts = user.username.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        data = {
            "email": user.email,
            "first_name": first_name,
            "last_name": last_name,
            "role": user.role.value,
            "agency_id": user.agency_id,
            "is_active": user.status == UserStatus.ACTIVE,
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
        if not resp.data:
            raise Exception("Failed to create ticket in database")
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

    async def delete(self, ticket_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("tickets").delete().eq("id", ticket_id).execute()
        )

    async def get_avg_resolution_time(self) -> float:
        def _query():
            return self._db.table("tickets").select("created_at, closed_at")\
                .not_.is_("closed_at", "null").execute()
        
        resp = await asyncio.to_thread(_query)
        if not resp.data: return 0.0
        
        total_mins = 0
        for row in resp.data:
            start = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(row["closed_at"].replace("Z", "+00:00"))
            total_mins += (end - start).total_seconds() / 60
            
        return total_mins / len(resp.data)


# ═══════════════════════════════════════════════════════════════════════════════
# TICKET MESSAGE REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class TicketMessageRepository(ITicketMessageRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> TicketMessage:
        return TicketMessage(
            id=row.get("id"),
            ticket_id=row.get("ticket_id", ""),
            user_id=row.get("user_id", ""),
            message=row.get("message", ""),
            created_at=datetime.fromisoformat(row.get("created_at").replace("Z", "+00:00")) if row.get("created_at") else datetime.utcnow(),
        )

    async def list_by_ticket(self, ticket_id: str) -> List[TicketMessage]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("ticket_messages")
                .select("*")
                .eq("ticket_id", ticket_id)
                .order("created_at", desc=False)
                .execute()
        )
        return [self._to_domain(r) for r in resp.data] if resp.data else []

    async def create(self, message: TicketMessage) -> TicketMessage:
        data = {
            "ticket_id": message.ticket_id,
            "user_id": message.user_id,
            "message": message.message,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("ticket_messages").insert(data).execute()
        )
        if not resp.data:
            raise Exception("Failed to save ticket message")
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

    async def get_recent_activity(self, limit: int = 10, agency_id: Optional[str] = None) -> List[AuditLog]:
        def _query():
            q = self._db.table("audit_logs").select("*")
            if agency_id:
                q = q.eq("agency_id", agency_id)
            return q.order("created_at", desc=True).limit(limit).execute()
            
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data]


# ═══════════════════════════════════════════════════════════════════════════════
# LICENSE REPOSITORY
class LicenseRepository(ILicenseRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> License:
        expires_str = row.get("expiration_date")
        try:
            expires_at = datetime.fromisoformat(expires_str.replace("Z", "+00:00")) if expires_str else None
        except (ValueError, TypeError):
            expires_at = None
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
            theme=row.get("theme", "dark"),
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
            "theme": license_.theme,
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
            "theme": license_.theme,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("licenses").update(data).eq("id", license_.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def delete(self, license_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("licenses").delete().eq("id", license_id).execute()
        )

    async def update_date(self, license_id: str, new_date: datetime) -> None:
        data = {"expiration_date": new_date.isoformat()}
        await asyncio.to_thread(
            lambda: self._db.table("licenses").update(data).eq("id", license_id).execute()
        )

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

    async def bulk_update_password(self, agency_id: str, new_password: str) -> int:
        def _update():
            return self._db.table("licenses").update({"admin_password": new_password}).eq("agency_id", agency_id).execute()
        resp = await asyncio.to_thread(_update)
        return len(resp.data) if resp.data else 0

    async def count_active_sessions(self, agency_id: Optional[str] = None) -> int:
        from datetime import datetime, timedelta
        two_mins_ago = (datetime.utcnow() - timedelta(minutes=2)).isoformat()
        
        def _query():
            q = self._db.table("license_sessions").select("id", count="exact")
            q = q.gt("last_ping", two_mins_ago)
            return q.execute()
            
        resp = await asyncio.to_thread(_query)
        return resp.count or 0

    async def get_last_pings(self, license_ids: List[str]) -> Dict[str, str]:
        """Returns {license_id: last_ping_timestamp} for the given licenses."""
        if not license_ids:
            return {}
        
        def _query():
            return self._db.table("license_sessions")\
                .select("license_id, last_ping")\
                .in_("license_id", license_ids)\
                .execute()
                
        resp = await asyncio.to_thread(_query)
        return {r["license_id"]: r["last_ping"] for r in resp.data}


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
class LeadRepository(ILeadRepository):
    def __init__(self, db: Client):
        self._db = db

    def _to_domain(self, row: dict) -> Lead:
        cap_str = row.get("created_at") or row.get("captured_at")
        try:
            cap_at = datetime.fromisoformat(cap_str.replace("Z", "+00:00")) if cap_str else datetime.utcnow()
        except (ValueError, TypeError):
            cap_at = datetime.utcnow()
        return Lead(
            id=row.get("id"),
            license_id=row.get("license_id", ""),
            username=row.get("username", ""),
            status=LeadStatus(row.get("status", "recopilado")),
            viewer_count=row.get("viewer_count", 0),
            source=row.get("source", "unknown"),
            likes_count=row.get("likes_count", 0),
            captured_at=cap_at
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

    async def list_paginated(
        self, 
        license_ids: List[str], 
        page: int = 1, 
        page_size: int = 50,
        status: Optional[LeadStatus] = None,
        search: Optional[str] = None,
        min_viewers: Optional[int] = None,
        min_likes: Optional[int] = None
    ) -> Tuple[List[Lead], int]:
        def _query():
            q = self._db.table("tiktok_leads").select("*", count="exact").in_("license_id", license_ids)
            if status:
                q = q.eq("status", status.value)
            if search:
                q = q.ilike("username", f"%{search}%")
            if min_viewers is not None:
                q = q.gte("viewer_count", min_viewers)
            if min_likes is not None:
                q = q.gte("likes_count", min_likes)
            
            start = (page - 1) * page_size
            return q.order("captured_at", desc=True).range(start, start + page_size - 1).execute()
            
        resp = await asyncio.to_thread(_query)
        return [self._to_domain(r) for r in resp.data], resp.count or 0

    async def get_license_performance_stats(self, license_ids: List[str]) -> Dict[str, Dict[str, int]]:
        """Returns {license_id: {today: count, total: count}}."""
        if not license_ids:
            return {}
        
        from datetime import datetime, time
        today_start = datetime.combine(datetime.utcnow().date(), time.min).isoformat()

        def _query_total():
            return self._db.table("tiktok_leads").select("license_id")\
                .in_("license_id", license_ids).execute()
        
        def _query_today():
            return self._db.table("tiktok_leads").select("license_id")\
                .in_("license_id", license_ids)\
                .gte("captured_at", today_start).execute()

        total_resp, today_resp = await asyncio.gather(
            asyncio.to_thread(_query_total),
            asyncio.to_thread(_query_today)
        )

        stats: Dict[str, Dict[str, int]] = {lid: {"today": 0, "total": 0} for lid in license_ids}
        
        for r in total_resp.data:
            lid = r["license_id"]
            if lid in stats: stats[lid]["total"] += 1
            
        for r in today_resp.data:
            lid = r["license_id"]
            if lid in stats: stats[lid]["today"] += 1

        return stats

    async def count_by_status(self, license_id: str) -> dict:
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads").select("status").eq("license_id", license_id).execute()
        )
        counts: dict = {}
        for row in resp.data:
            s = row.get("status")
            counts[s] = counts.get(s, 0) + 1
        return counts

    async def count_by_status_bulk(self, license_ids: list[str]) -> dict:
        """Single IN() query → aggregates {status: count} for all license_ids at once."""
        if not license_ids:
            return {}
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads")
                .select("status")
                .in_("license_id", license_ids)
                .execute()
        )
        counts: dict = {}
        for row in resp.data:
            s = row.get("status")
            counts[s] = counts.get(s, 0) + 1
        return counts

    async def get_daily_stats_bulk(self, license_ids: List[str], days: int) -> List[dict]:
        from datetime import datetime, timedelta
        stats = []
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).date()
            start = datetime.combine(date, datetime.min.time()).isoformat()
            end = datetime.combine(date, datetime.max.time()).isoformat()
            
            def _query():
                return self._db.table("tiktok_leads").select("id", count="exact")\
                    .in_("license_id", license_ids)\
                    .gte("captured_at", start)\
                    .lte("captured_at", end).execute()
            
            resp = await asyncio.to_thread(_query)
            stats.append({"date": date.isoformat(), "count": resp.count or 0})
            
        return stats[::-1]  # Older first

    async def count_by_status_grouped_by_license(self, license_ids: List[str]) -> Dict[str, Dict[str, int]]:
        """Returns {license_id: {status: count}} grouped by license in a single query."""
        if not license_ids:
            return {}
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads")
                .select("license_id, status")
                .in_("license_id", license_ids)
                .execute()
        )
        counts: Dict[str, Dict[str, int]] = {}
        for row in resp.data:
            lid = row.get("license_id")
            s = row.get("status")
            if lid not in counts:
                counts[lid] = {}
            counts[lid][s] = counts[lid].get(s, 0) + 1
        return counts

    async def count_under_date(self, license_ids: List[str], start_date: datetime) -> Dict[str, int]:
        """Returns {status: count} for leads captured >= start_date for all provided licenses."""
        if not license_ids:
            return {}
        start_iso = start_date.isoformat()
        resp = await asyncio.to_thread(
            lambda: self._db.table("tiktok_leads")
                .select("status")
                .in_("license_id", license_ids)
                .gte("captured_at", start_iso)
                .execute()
        )
        counts: Dict[str, int] = {}
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
        rel_str = row.get("release_date")
        try:
            rel_date = datetime.fromisoformat(rel_str.replace("Z", "+00:00")) if rel_str else datetime.utcnow()
        except (ValueError, TypeError):
            rel_date = datetime.utcnow()
        return AppVersion(
            id=row.get("id"),
            version_number=row.get("version_number", ""),
            changelog=row.get("changelog", ""),
            is_active=row.get("is_active", True),
            file_url=row.get("file_url", ""),
            file_size_kb=row.get("file_size_kb", 0),
            tags=row.get("tags") or [],
            platform=row.get("platform", "windows"),
            release_date=rel_date,
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
