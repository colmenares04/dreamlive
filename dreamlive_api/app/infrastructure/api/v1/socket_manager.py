import socketio
import logging
from datetime import datetime
from typing import Any, Dict, List
from app.adapters.security.handlers import JWTHandler
from app.adapters.db.session import get_supabase
from app.adapters.db.repositories.all_repos import TicketMessageRepository, LicenseRepository
from app.core.entities.models import TicketMessage

from app.config import settings

logger = logging.getLogger("dreamlive.socket")

# Definimos el servidor asíncrono con soporte para CORS sincronizado con la App
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.ALLOWED_ORIGINS + [
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    logger=True,
    engineio_logger=False
)

# Wrapper base para Socket.io
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ, auth):
    """
    Validación de conexión mediante objeto auth.
    Soporta:
    1. JWT (Web): { "token": "eyJ..." }
    2. License Key (Ext): { "token": "DL-..." }
    """
    logger.info(f"🔍 [Socket.io] Intento de conexión [{sid}] | Auth: {auth}")
    
    if not auth or 'token' not in auth:
        logger.warning(f"❌ [Socket.io] Conexión rechazada [{sid}]: Falta objeto 'auth' o 'token'")
        return False
    
    token = auth['token']
    db = get_supabase()

    # CASO 1: JWT (Web App)
    if token.startswith("eyJ"):
        try:
            payload = JWTHandler.decode_token(token)
            await sio.save_session(sid, {
                "user_id": payload.get("sub"),
                "role": payload.get("role"),
                "type": "web"
            })
            logger.info(f"✅ [Socket.io] Conexión aceptada (WEB) [{sid}]: User {payload.get('sub')}")
            return True
        except Exception as e:
            logger.error(f"❌ [Socket.io] Error JWT [{sid}]: {str(e)}")
            return False

    # CASO 2: License Key (Extension)
    try:
        license_repo = LicenseRepository(db)
        license_entry = await license_repo.get_by_key(token)
        
        if license_entry and license_entry.is_active:
            await sio.save_session(sid, {
                "license_id": license_entry.id,
                "agency_id": license_entry.agency_id,
                "type": "ext"
            })
            logger.info(f"✅ [Socket.io] Conexión aceptada (EXT) [{sid}]: License {license_entry.id}")
            return True
        else:
            logger.warning(f"❌ [Socket.io] Conexión rechazada (EXT) [{sid}]: Licencia inválida o inactiva")
            return False
            
    except Exception as e:
        logger.error(f"❌ [Socket.io] Error Licencia [{sid}]: {str(e)}")
        return False

@sio.event
async def disconnect(sid):
    logger.info(f"Desconectado: {sid}")

@sio.on("join_agency")
async def join_agency(sid, agency_id: str):
    """Permite que un socket se una a la sala de su agencia si está autorizado."""
    session = await sio.get_session(sid)
    user_agency_id = session.get("agency_id")
    
    # [SECURITY] Solo permitir si pertenece a esa agencia
    if str(user_agency_id) != str(agency_id):
        logger.warning(f"Intento de acceso no autorizado a sala de agencia {agency_id} por socket {sid}")
        return

    await sio.enter_room(sid, f"agency_{agency_id}")
    logger.info(f"Socket {sid} se unió a la sala de la agencia {agency_id}")

@sio.on("join_ticket")
async def join_ticket(sid, ticket_id: str):
    """Permite unirse a la sala de chat de un ticket específico tras validación."""
    session = await sio.get_session(sid)
    
    # [SECURITY] Para WEB, validar que pertenece a la agencia del ticket (simplificado)
    # En un sistema ideal, haríamos una consulta a repo.get_by_id(ticket_id)
    # Por ahora aseguramos que el socket TIENE una sesión válida.
    if not session.get("user_id") and not session.get("license_id"):
        return

    await sio.enter_room(sid, f"ticket_{ticket_id}")
    logger.info(f"Socket {sid} se unió al ticket {ticket_id}")

@sio.on("send_message")
async def handle_send_message(sid, data: Dict[str, Any]):
    """
    Recibe un mensaje de chat, lo persiste en BD y lo distribuye a la sala del ticket.
    Expected data: { "ticket_id": "...", "message": "..." }
    """
    ticket_id = data.get("ticket_id")
    content = data.get("message")
    
    if not ticket_id or not content:
        return
    
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    
    if not user_id:
        logger.warning(f"Intento de mensaje sin sesión de usuario [{sid}]")
        return

    try:
        # Persistencia en Supabase
        db = get_supabase()
        repo = TicketMessageRepository(db)
        
        new_msg = TicketMessage(
            ticket_id=ticket_id,
            user_id=user_id,
            message=content
        )
        saved = await repo.create(new_msg)
        
        # Broadcast a los interesados en el ticket
        broadcast_payload = {
            "id": saved.id,
            "ticket_id": ticket_id,
            "user_id": user_id,
            "message": saved.message,
            "created_at": saved.created_at.isoformat()
        }
        await sio.emit("chat_message", broadcast_payload, room=f"ticket_{ticket_id}")
        logger.info(f"Mensaje procesado en ticket {ticket_id} por {user_id}")
        
    except Exception as e:
        logger.error(f"Error procesando mensaje socket: {str(e)}")

class SocketManager:
    """
    Controlador centralizado para emitir mensajes a través de Socket.io.
    Facilita la comunicación desde servicios y use cases.
    """
    
    @staticmethod
    async def emit_to_agency(agency_id: str, event: str, data: Any):
        """Notificación global para toda una agencia (ej: nuevo lead capturado)."""
        await sio.emit(event, data, room=f"agency_{agency_id}")

    @staticmethod
    async def emit_to_ticket(ticket_id: str, event: str, data: Any):
        """Mensaje de chat para un ticket específico."""
        await sio.emit(event, data, room=f"ticket_{ticket_id}")

    @staticmethod
    async def broadcast_notification(message: str, type: str = "info", title: str = "Aviso Sistema"):
        """Envía una notificación a TODOS los usuarios conectados en el sistema."""
        await sio.emit("new_notification", {
            "title": title,
            "message": message,
            "type": type,
            "id": int(datetime.utcnow().timestamp() * 1000)
        })

    @staticmethod
    async def notify_sid(sid: str, message: str, type: str = "info", title: str = "Privado"):
        """Envía una notificación a un socket específico."""
        await sio.emit("new_notification", {
            "title": title,
            "message": message,
            "type": type,
            "id": int(datetime.utcnow().timestamp() * 1000)
        }, to=sid)

    @staticmethod
    async def emit_remote_command(agency_id: str, action: str, params: Dict[str, Any] = None):
        """Envía un comando de control remoto a los agentes de una agencia."""
        await sio.emit("remote_command", {
            "action": action,
            "params": params or {},
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }, room=f"agency_{agency_id}")

    @staticmethod
    async def send_system_notification(sid: str, message: str, type: str = "info"):
        """Envía una alerta directa a un cliente específico (Compatibilidad legacy)."""
        await sio.emit("system_notification", {"message": message, "type": type}, to=sid)

# Exportamos la instancia y la app para FastAPI
socket_manager = SocketManager()
