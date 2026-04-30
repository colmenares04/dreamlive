from abc import ABC, abstractmethod
from typing import Any, Dict

class IRealTimeGateway(ABC):
    """
    Puerto para comunicación en tiempo real.
    Permite enviar mensajes a clientes conectados sin depender de la implementación (WS, Socket.io, etc).
    """
    
    @abstractmethod
    async def emit_to_session(self, session_id: str, event: str, payload: Dict[str, Any]) -> None:
        """Envía un mensaje directo a una sesión/dispositivo específico."""
        ...

    @abstractmethod
    async def broadcast_to_license(self, license_id: str, event: str, payload: Dict[str, Any]) -> None:
        """Envía un mensaje a todas las sesiones vinculadas a una licencia."""
        ...

    @abstractmethod
    async def broadcast_to_agency(self, agency_id: str, event: str, payload: Dict[str, Any]) -> None:
        """Envía un mensaje a todos los usuarios/licencias de una agencia."""
        ...
