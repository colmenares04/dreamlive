"""
Repositorio concreto de Usuarios (Supabase).

Adaptador en la capa de Adapters. Implementa IUserRepository
usando el cliente sincrónico de supabase-py ejecutado en thread pool.
"""
import asyncio
from typing import List, Optional

from supabase import Client

from app.core.entities.user import User, UserRole, UserStatus
from app.core.ports.user_repository import IUserRepository


class UserRepository(IUserRepository):
    """Implementación Supabase del repositorio de usuarios."""

    def __init__(self, db: Client) -> None:
        self._db = db

    def _to_domain(self, row: dict) -> User:
        username = row.get("first_name", "")
        if row.get("last_name"):
            username += " " + row["last_name"]
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
        data = {
            "email": user.email,
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else "",
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
        data = {
            "email": user.email,
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else "",
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
