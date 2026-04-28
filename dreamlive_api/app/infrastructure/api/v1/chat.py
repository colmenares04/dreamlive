from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import List
from datetime import datetime
import json

from app.adapters.db.session import get_db
from app.adapters.db.repositories.all_repos import TicketMessageRepository, UserRepository
from app.adapters.security.handlers import JWTHandler
from app.core.entities.models import TicketMessage
from .socket_manager import socket_manager

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.get("/history/{ticket_id}")
async def get_chat_history(ticket_id: str, db=Depends(get_db)):
    """Retorna el historial de mensajes de un ticket."""
    repo = TicketMessageRepository(db)
    messages = await repo.list_by_ticket(ticket_id)
    return [
        {
            "id": m.id,
            "ticket_id": m.ticket_id,
            "user_id": m.user_id,
            "message": m.message,
            "created_at": m.created_at.isoformat()
        } for m in messages
    ]


@router.post("/notify-all", tags=["Notifications"])
async def broadcast_global_notification(message: str, type: str = "info"):
    """
    Ejemplo de cómo extender el sistema para notificaciones globales.
    Deja la base lista para otros tipos de alertas.
    """
    payload = {
        "type": "global_notification",
        "message": message,
        "variant": type,
        "timestamp": datetime.utcnow().isoformat()
    }
    # En un sistema real, el Manager tendría una lista de "all_active_connections"
    # Por ahora lo dejamos como arquitectura base.
    return {"status": "broadcast_prepared", "note": "Arquitectura extensible lista"}
