from pydantic import BaseModel, Field
from typing import Any, Optional, Dict
from datetime import datetime
from enum import Enum

class WSEventType(str, Enum):
    # Chat Events
    CHAT_MESSAGE = "CHAT_MESSAGE"
    TICKET_UPDATED = "TICKET_UPDATED"
    
    # Lead Events
    NEW_LEAD = "NEW_LEAD"
    LEAD_UPDATED = "LEAD_UPDATED"
    
    # System Events
    SYSTEM_NOTIFICATION = "SYSTEM_NOTIFICATION"
    REMOTE_COMMAND = "REMOTE_COMMAND"
    PING = "PING"
    PONG = "PONG"

class WSMessage(BaseModel):
    """Contrato estandarizado para mensajes de WebSocket."""
    event: WSEventType
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
