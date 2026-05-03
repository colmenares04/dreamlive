"""
Notification domain entity.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


@dataclass
class Notification:
    id: str
    user_id: str
    title: str
    description_ext: str = ""
    description_web: str = ""
    images: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
