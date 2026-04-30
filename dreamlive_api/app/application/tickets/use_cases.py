from typing import List
from app.core.entities.ticket import TicketMessage
from app.core.ports.unit_of_work import IUnitOfWork

class SaveChatMessageUseCase:
    """Caso de uso para persistir un mensaje de chat enviado por un usuario."""
    
    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, ticket_id: str, user_id: str, message_text: str) -> TicketMessage:
        async with self._uow:
            msg = TicketMessage(
                ticket_id=ticket_id,
                user_id=user_id,
                message=message_text
            )
            saved = await self._uow.ticket_messages.create(msg)
            await self._uow.commit()
            return saved

class ListChatMessagesUseCase:
    """Caso de uso para obtener el historial de mensajes de un ticket."""

    def __init__(self, uow: IUnitOfWork):
        self._uow = uow

    async def execute(self, ticket_id: str) -> List[TicketMessage]:
        return await self._uow.ticket_messages.list_by_ticket(ticket_id)
