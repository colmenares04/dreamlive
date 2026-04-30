/**
 * Servicio de WebSocket robusto para la extensión.
 * Implementa reconexión automática, heartbeat (ping/pong) y despacho de eventos.
 */
export type WSEventCallback = (payload: any) => void;

class SocketService {
  private static instance: SocketService;
  private socket: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private sessionId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000; // 1s
  private heartbeatInterval: any = null;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Inicializa la conexión WebSocket.
   */
  public connect(url: string, token: string, sessionId?: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.url = url;
    this.token = token;
    this.sessionId = sessionId || null;
    
    const wsUrl = new URL(url);
    wsUrl.searchParams.set('token', token);
    if (sessionId) {
      wsUrl.searchParams.set('session_id', sessionId);
    }

    console.log(`[WS] Conectando a ${wsUrl.origin}...`);
    this.socket = new WebSocket(wsUrl.toString());

    this.socket.onopen = () => {
      console.log('✅ [WS] Conectado');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyListeners('CONNECTED', { status: 'open' });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'PONG') return; // Heartbeat silenciado
        
        console.log(`[WS] Evento recibido: ${data.event}`, data.payload);
        this.notifyListeners(data.event, data.payload);
      } catch (err) {
        console.error('[WS] Error parseando mensaje:', err);
      }
    };

    this.socket.onclose = (event) => {
      console.warn(`[WS] Desconectado: ${event.reason} (Code: ${event.code})`);
      this.stopHeartbeat();
      this.handleReconnect();
    };

    this.socket.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  /**
   * Envía un mensaje estructurado al servidor.
   */
  public send(event: string, payload: any = {}): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString()
      });
      this.socket.send(message);
    } else {
      console.warn('[WS] Intento de envío sin conexión activa');
    }
  }

  /**
   * Se suscribe a un evento específico.
   */
  public on(event: string, callback: WSEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Retorna función para desuscribirse
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Cierra la conexión WebSocket y limpia los intervalos.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Cierre de sesión manual');
      this.socket = null;
    }
    this.stopHeartbeat();
    console.log('🛑 [WS] Desconectado manualmente');
  }

  private notifyListeners(event: string, payload: any): void {
    this.listeners.get(event)?.forEach(callback => callback(payload));
  }

  /**
   * Lógica de reconexión con retroceso exponencial.
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
        30000 // Máximo 30s
      );
      
      console.log(`[WS] Reintentando conexión en ${delay / 1000}s... (Intento ${this.reconnectAttempts + 1})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.url, this.token, this.sessionId || undefined);
      }, delay);
    } else {
      console.error('[WS] Máximos intentos de reconexión alcanzados');
    }
  }

  /**
   * Mantiene la conexión viva enviando PING cada cierto tiempo.
   * Crucial para que el Service Worker no se duerma.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send('PING');
    }, 25000); // 25s
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const socketService = SocketService.getInstance();
