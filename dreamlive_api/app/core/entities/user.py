from dataclasses import dataclass
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    SUPERUSER = "superuser"
    AGENCY_ADMIN = "agency_admin"
    AGENT = "agent"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


@dataclass
class User:
    id: Optional[str] = None
    email: str = ""
    username: str = ""
    role: UserRole = UserRole.AGENT
    agency_id: Optional[str] = None
    password_hash: Optional[str] = None
    status: UserStatus = UserStatus.PENDING
