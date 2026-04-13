"""
Entidades de dominio para mantener compatibilidad temporal del JWT.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Optional

class UserRole(str, Enum):
    ADMIN = "admin"
    PROGRAMMER = "programmer"
    OWNER = "owner"
    AGENT = "agent"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

@dataclass
class User:
    id: str | None
    email: str
    username: str
    role: UserRole
    agency_id: str | None
    password_hash: str | None = None
    status: UserStatus = UserStatus.ACTIVE

    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE
