"""
Entidades de dominio: AppVersion.

Pertenece a la capa Core. Cero dependencias externas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class Platform(str, Enum):
    WINDOWS = "windows"
    MACOS = "macos"


class VersionTag(str, Enum):
    NEW = "new"
    FIX = "fix"
    FEAT = "feat"
    PERF = "perf"
    SEC = "sec"


@dataclass
class AppVersion:
    """Versión publicada de la extensión o aplicación DreamLive."""

    id: Optional[str] = None
    version_number: str = ""
    changelog: str = ""
    is_active: bool = True
    file_url: str = ""
    file_size_kb: int = 0
    release_date: datetime = field(default_factory=datetime.utcnow)
    tags: List[str] = field(default_factory=list)
    platform: str = Platform.WINDOWS
