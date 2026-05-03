import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { TokenStorage } from '../services/http/tokenStorage';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { info, error: toastError, warning } = useNotifications();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = TokenStorage.getAccessToken() || TokenStorage.getAgencyToken();
    if (!token) return;

    // El SOCKET_URL debe ser la base (vía wrapper ASGI en main.py)
    const BASE_URL = import.meta.env.VITE_API_URL_BASE || 'http://217.216.94.178:8000';

    const newSocket = io(BASE_URL, {
      path: "/socket.io",
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    // --- DEBUGGING AVANZADO ---
    console.log(`🔌 [Socket.io] Intentando conexión a ${BASE_URL}/socket.io`);

    newSocket.on('connect', () => {
      const transport = newSocket.io.engine.transport.name;
      console.log(`✅ [Socket.io] Conectado exitosamente [ID: ${newSocket.id}] [Transporte: ${transport}]`);
      setConnected(true);

      if (user?.agency_id) {
        newSocket.emit('join_agency', user.agency_id);
      }
    });

    newSocket.on('connect_error', (err: any) => {
      console.group('❌ [Socket.io] Error de Conexión');
      console.error('Mensaje:', err.message);
      console.error('Tipo:', err.type);
      console.error('Descripción:', err.description);
      console.error('Contexto:', err.context);
      console.groupEnd();
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.warn(`🔄 [Socket.io] Intento de reconexión #${attempt}`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('💀 [Socket.io] Fallaron todos los intentos de reconexión');
    });

    newSocket.on('new_notification', (data: { title: string, message: string, type: string }) => {
      console.log('🔔 [Socket.io] Notificación recibida:', data);
      switch (data.type) {
        case 'success': info(data.message); break;
        case 'error': toastError(data.message); break;
        case 'warning': warning(data.message); break;
        default: info(data.message);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.warn(`🔌 [Socket.io] Desconectado. Razón: ${reason}`);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.agency_id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
