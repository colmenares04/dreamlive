import { useCallback } from 'react';

/**
 * useWebNotifications Hook - Optimizado y Robusto
 * 
 * Implementa la API de notificaciones nativa con manejo de gestos y fallbacks.
 */
export function useWebNotifications() {
  /**
   * Solicita permiso. IMPORTANTE: Debe llamarse desde un evento de usuario (onClick).
   */
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') return true;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Error al solicitar permiso de notificación:', err);
      return false;
    }
  }, []);

  /**
   * Muestra una notificación.
   */
  const notify = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) return;

    // No solicitamos permiso aquí de forma asíncrona "ciega" para evitar bloqueos del navegador
    if (Notification.permission !== 'granted') {
      console.warn('Permiso de notificación no concedido.');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/logo.png',
      badge: '/logo.png',
      silent: false,
      ...options
    };

    try {
      // Priorizamos notificación nativa simple para máxima compatibilidad en Web App
      const n = new Notification(title, defaultOptions);
      
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.error('Error al mostrar notificación nativa:', err);
      
      // Fallback a Service Worker solo si el constructor nativo falla (común en algunos móviles)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, defaultOptions);
        }).catch(swErr => {
          console.error('Fallback de Service Worker también falló:', swErr);
        });
      }
    }
  }, []);

  /**
   * Atajo para notificaciones de chat.
   */
  const notifyNewMessage = useCallback((senderName: string, message: string) => {
    notify(`Mensaje de ${senderName}`, {
      body: message,
      tag: 'chat-notification',
      renotify: true,
    } as any);
  }, [notify]);

  return { requestPermission, notify, notifyNewMessage };
}
