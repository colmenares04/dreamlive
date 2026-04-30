import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import List, Optional

from app.core.domain.exceptions import UnauthorizedAccess
from app.infrastructure.api.providers import (
    get_save_chat_message_use_case,
    get_list_chat_messages_use_case,
    get_token_service,
    get_uow
)
from app.application.tickets.use_cases import SaveChatMessageUseCase, ListChatMessagesUseCase
from app.core.ports.unit_of_work import IUnitOfWork
from app.core.ports.security import ITokenService

from .socket_manager import socket_manager
from .websocket_schemas import WSMessage, WSEventType

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger("dreamlive.chat")

@router.get("/history/{ticket_id}")
async def get_chat_history(
    ticket_id: str, 
    use_case: ListChatMessagesUseCase = Depends(get_list_chat_messages_use_case)
):
    """Retorna el historial de mensajes de un ticket usando el caso de uso."""
    messages = await use_case.execute(ticket_id)
    return [
        {
            "id": m.id,
            "ticket_id": m.ticket_id,
            "user_id": m.user_id,
            "message": m.message,
            "created_at": m.created_at.isoformat()
        } for m in messages
    ]

@router.websocket("/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    session_id: Optional[str] = Query(None),
    token_service: ITokenService = Depends(get_token_service),
    uow: IUnitOfWork = Depends(get_uow),
    save_chat_use_case: SaveChatMessageUseCase = Depends(get_save_chat_message_use_case)
):
    """
    Endpoint principal de WebSocket para Chat y Notificaciones.
    Maneja autenticación, persistencia y despacho de eventos.
    """
    metadata = {"session_id": session_id}
    
    # 1. Autenticación
    try:
        if token.startswith("DL-"): # License Key (Extensión)
            async with uow:
                license_entry = await uow.licenses.get_by_key(token)
                if not license_entry or not license_entry.is_active:
                    raise UnauthorizedAccess("Licencia inválida o inactiva")
                metadata = {
                    "license_id": str(license_entry.id),
                    "agency_id": str(license_entry.agency_id),
                    "type": "ext"
                }
        else: # JWT (Web)
            payload = token_service.decode_token(token)
            metadata = {
                "user_id": str(payload.get("sub")),
                "agency_id": str(payload.get("agency_id")),
                "type": "web"
            }
    except Exception as e:
        logger.warning(f"Conexión WS rechazada: {str(e)}")
        await websocket.close(code=1008)
        return

    # 2. Registro
    await socket_manager.connect(websocket, metadata)
    
    try:
        while True:
            # Esperar mensajes del cliente
            data = await websocket.receive_text()
            try:
                raw_msg = json.loads(data)
                ws_msg = WSMessage(**raw_msg)
            except Exception:
                logger.warning(f"Formato de mensaje WS inválido recibido: {data}")
                continue

            # 3. Despacho de Eventos
            if ws_msg.event == WSEventType.PING:
                await websocket.send_json({"event": "PONG", "payload": {}})
                continue

            if ws_msg.event == WSEventType.CHAT_MESSAGE:
                ticket_id = ws_msg.payload.get("ticket_id")
                content = ws_msg.payload.get("message")
                
                if ticket_id and content:
                    # Usar el caso de uso inyectado para persistir
                    saved = await save_chat_use_case.execute(
                        ticket_id=ticket_id,
                        user_id=metadata.get("user_id") or metadata.get("license_id"),
                        message_text=content
                    )
                    
                    # Broadcast a la agencia (o implementar lógica por ticket room)
                    broadcast_payload = WSMessage(
                        event=WSEventType.CHAT_MESSAGE,
                        payload={
                            "id": str(saved.id),
                            "ticket_id": ticket_id,
                            "user_id": str(saved.user_id),
                            "message": saved.message,
                            "created_at": saved.created_at.isoformat()
                        }
                    )
                    await socket_manager.broadcast_to_agency(metadata["agency_id"], broadcast_payload)

    except WebSocketDisconnect:
        socket_manager.disconnect(websocket)
        logger.info(f"WS Desconectado para {metadata.get('user_id') or metadata.get('license_id')}")
    except Exception as e:
        logger.error(f"Error inesperado en loop WS: {str(e)}")
        socket_manager.disconnect(websocket)
