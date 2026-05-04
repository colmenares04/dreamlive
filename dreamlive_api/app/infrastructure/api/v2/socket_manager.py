import logging
import json
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect

from app.core.ports.realtime import IRealTimeGateway
from .websocket_schemas import WSMessage, WSEventType

logger = logging.getLogger("dreamlive.websocket")

class ConnectionManager(IRealTimeGateway):
    """
    Gestor de conexiones WebSocket centralizado.
    Implementa IRealTimeGateway para cumplir con Clean Architecture.
    """
    def __init__(self):
        # Mapeos de ID -> Conjunto de WebSockets activos (un usuario puede tener varios tabs)
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        self.license_connections: Dict[str, Set[WebSocket]] = {}
        self.agency_connections: Dict[str, Set[WebSocket]] = {}
        self.session_connections: Dict[str, WebSocket] = {} # Mapeo 1:1 para sesiones únicas
        
        # Mapeo inverso WebSocket -> Metadata para limpieza rápida
        self.socket_metadata: Dict[WebSocket, Dict[str, str]] = {}

    async def connect(self, websocket: WebSocket, metadata: Dict[str, str]):
        """Acepta la conexión y registra el socket en los grupos correspondientes."""
        await websocket.accept()
        
        user_id = metadata.get("user_id")
        license_id = metadata.get("license_id")
        agency_id = metadata.get("agency_id")
        session_id = metadata.get("session_id")
        
        self.socket_metadata[websocket] = metadata

        # Registro por sesión única (para expulsión dirigida)
        if session_id:
            # Si ya existía una conexión para este session_id, la cerramos (reemplazo)
            if session_id in self.session_connections:
                old_socket = self.session_connections[session_id]
                try:
                    await old_socket.close(code=1000)
                except: pass
            self.session_connections[session_id] = websocket

        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)

        if license_id:
            if license_id not in self.license_connections:
                self.license_connections[license_id] = set()
            self.license_connections[license_id].add(websocket)

        if agency_id:
            if agency_id not in self.agency_connections:
                self.agency_connections[agency_id] = set()
            self.agency_connections[agency_id].add(websocket)

        logger.info(f"✅ WS Conectado | Session: {session_id} | Type: {metadata.get('type')}")

    def disconnect(self, websocket: WebSocket):
        """Limpia el socket de todos los registros."""
        metadata = self.socket_metadata.pop(websocket, {})
        user_id = metadata.get("user_id")
        license_id = metadata.get("license_id")
        agency_id = metadata.get("agency_id")
        session_id = metadata.get("session_id")

        if session_id and self.session_connections.get(session_id) == websocket:
            del self.session_connections[session_id]

        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        if license_id and license_id in self.license_connections:
            self.license_connections[license_id].discard(websocket)
            if not self.license_connections[license_id]:
                del self.license_connections[license_id]

        if agency_id and agency_id in self.agency_connections:
            self.agency_connections[agency_id].discard(websocket)
            if not self.agency_connections[agency_id]:
                del self.agency_connections[agency_id]

    # ── Implementación de IRealTimeGateway ──────────────────────────────────────

    async def emit_to_session(self, session_id: str, event: str, payload: Dict[str, Any]) -> None:
        """Envía un mensaje directo a una sesión específica (ej. para FORCE_LOGOUT)."""
        socket = self.session_connections.get(session_id)
        if socket:
            try:
                # Usamos el esquema estandarizado
                msg = WSMessage(event=event, payload=payload)
                await socket.send_json(msg.model_dump(mode='json'))
            except Exception as e:
                logger.error(f"Error emitiendo a sesión {session_id}: {e}")
                self.disconnect(socket)

    async def broadcast_to_license(self, license_id: str, event: str, payload: Dict[str, Any]) -> None:
        """Notifica a todos los dispositivos de una licencia."""
        sockets = self.license_connections.get(license_id, set())
        msg = WSMessage(event=event, payload=payload)
        for socket in list(sockets):
            try:
                await socket.send_json(msg.model_dump(mode='json'))
            except Exception:
                self.disconnect(socket)

    async def broadcast_to_agency(self, agency_id: str, event: str, payload: Dict[str, Any]) -> None:
        """Notifica a toda la agencia."""
        sockets = self.agency_connections.get(agency_id, set())
        msg = WSMessage(event=event, payload=payload)
        for socket in list(sockets):
            try:
                await socket.send_json(msg.model_dump(mode='json'))
            except Exception:
                self.disconnect(socket)

# Instancia global exportada
socket_manager = ConnectionManager()
