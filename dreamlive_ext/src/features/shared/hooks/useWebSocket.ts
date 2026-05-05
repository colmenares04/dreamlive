import { useEffect, useCallback } from 'react';
import { socketService, WSEventCallback } from '../../../infrastructure/websocket/socket.service';

/**
 * Hook para suscribirse a eventos de WebSocket de forma declarativa en componentes React.
 * 
 * @param event Nombre del evento a escuchar (ej: 'CHAT_MESSAGE', 'NEW_LEAD')
 * @param callback Función que se ejecutará al recibir el evento
 */
export function useWebSocket(event: string, callback: WSEventCallback) {
  useEffect(() => {
    // Suscribirse al evento al montar el componente
    const unsubscribe = socketService.on(event, callback);

    // Desuscribirse al desmontar para evitar fugas de memoria
    return () => {
      unsubscribe();
    };
  }, [event, callback]);

  /**
   * Facilita el envío de mensajes desde el componente.
   */
  const sendMessage = useCallback((payload: any) => {
    socketService.send(event, payload);
  }, [event]);

  return { sendMessage };
}

/**
 * Hook utilitario para enviar cualquier evento sin suscripción.
 */
export function useWS() {
  return {
    send: (event: string, payload: any) => socketService.send(event, payload),
    connect: (url: string, token: string) => socketService.connect(url, token)
  };
}
