import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { TicketMessage } from '../services/http/tickets';

/**
 * useChat Hook (Socket.io version)
 * 
 * Gestiona la comunicación en tiempo real para un ticket específico usando Socket.io.
 * 
 * @param {string} ticketId - ID del ticket para la sala de chat.
 * @returns {Object} { messages, sendMessage, connected, error }
 */
export function useChat(ticketId: string | null) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !ticketId) return;

    // Unirse a la sala del ticket
    socket.emit('join_ticket', ticketId);

    // Escuchar nuevos mensajes
    const handleMessage = (data: any) => {
      if (data.ticket_id === ticketId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id,
            ticket_id: data.ticket_id,
            user_id: data.user_id,
            message: data.message,
            created_at: data.created_at
          }];
        });
      }
    };

    socket.on('chat_message', handleMessage);

    return () => {
      socket.off('chat_message', handleMessage);
    };
  }, [socket, ticketId]);

  /**
   * Enviar un mensaje de texto al servidor via Socket.io.
   */
  const sendMessage = useCallback((message: string) => {
    if (socket && connected && ticketId) {
      socket.emit('send_message', { ticket_id: ticketId, message });
    } else {
      console.warn('[useChat] No se puede enviar: socket desconectado.');
      setError('Conexión perdida. Intentando reconectar...');
    }
  }, [socket, connected, ticketId]);

  return { messages, setMessages, sendMessage, connected, error };
}
