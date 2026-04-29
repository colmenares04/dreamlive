"""
Repositorio concreto de Agencias (Supabase).

Adaptador en la capa de Adapters. Implementa IAgencyRepository
usando el cliente sincrónico de supabase-py ejecutado en thread pool.
"""
import asyncio
from typing import List, Optional

from supabase import Client

from app.core.entities.agency import Agency
from app.core.ports.agency_repository import IAgencyRepository


class AgencyRepository(IAgencyRepository):
    """Implementación Supabase del repositorio de agencias."""

    def __init__(self, db: Client) -> None:
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

    async def get_by_id(self, agency_id: str) -> Optional[Agency]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("agencies").select("*").eq("id", agency_id).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def get_by_email(self, email: str) -> Optional[Agency]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("agencies").select("*").eq("email", email).execute()
        )
        return self._to_domain(resp.data[0]) if resp.data else None

    async def create(self, agency: Agency) -> Agency:
        data = {
            "name": agency.name,
            "logo_url": agency.logo_url,
            "email": agency.email,
            "password": agency.password,
            "role_permissions": agency.role_permissions,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("agencies").insert(data).execute()
        )
        return self._to_domain(resp.data[0])

    async def update(self, agency: Agency) -> Agency:
        data = {
            "name": agency.name,
            "logo_url": agency.logo_url,
            "email": agency.email,
            "password": agency.password,
            "role_permissions": agency.role_permissions,
        }
        resp = await asyncio.to_thread(
            lambda: self._db.table("agencies").update(data).eq("id", agency.id).execute()
        )
        return self._to_domain(resp.data[0])

    async def list_all(self) -> List[Agency]:
        resp = await asyncio.to_thread(
            lambda: self._db.table("agencies").select("*").execute()
        )
        return [self._to_domain(r) for r in resp.data]

    async def delete(self, agency_id: str) -> None:
        await asyncio.to_thread(
            lambda: self._db.table("agencies").delete().eq("id", agency_id).execute()
        )
