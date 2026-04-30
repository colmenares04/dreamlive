import { storage } from '#imports';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * ApiClient
 * 
 * Clase encargada de gestionar todas las peticiones HTTP al backend.
 * Implementa auto-refresh de tokens y reintento de peticiones.
 */
class ApiClient {
  private readonly baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.baseUrl = import.meta.env.WXT_API_BASE_URL || 'http://localhost:8000/api/v1';
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.map(cb => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Intenta refrescar el token de acceso usando el refresh token almacenado.
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await storage.getItem<string>('local:refresh_token');
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      const newToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      // Guardar nuevos tokens
      await storage.setItem('local:token', newToken);
      if (newRefreshToken) {
        await storage.setItem('local:refresh_token', newRefreshToken);
      }

      return newToken;
    } catch (error) {
      console.error('[AUTH] Error refrescando token:', error);
      // Limpiar tokens si el refresh falla definitivamente
      await storage.removeItem('local:token');
      await storage.removeItem('local:refresh_token');
      return null;
    }
  }

  /**
   * Método core para realizar peticiones. Centraliza headers, auth y manejo de errores.
   */
  private async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT', 
    body?: any,
    params?: Record<string, string>,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    try {
      const token = await storage.getItem<string>('local:token');
      
      const url = new URL(`${this.baseUrl}${endpoint}`);
      if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const status = response.status;

      // LÓGICA DE AUTO-REFRESH (401 Unauthorized)
      if (status === 401 && !isRetry && endpoint !== '/auth/refresh') {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const newToken = await this.refreshToken();
          this.isRefreshing = false;

          if (newToken) {
            this.onTokenRefreshed(newToken);
            // Reintentar la petición original con el nuevo token
            return this.request<T>(endpoint, method, body, params, true);
          }
        } else {
          // Esperar a que el refresh en curso termine y reintentar
          return new Promise((resolve) => {
            this.addRefreshSubscriber((token) => {
              resolve(this.request<T>(endpoint, method, body, params, true));
            });
          });
        }
      }
      
      if (status === 204) {
        return { status, data: {} as T };
      }

      const text = await response.text();
      const responseData = text ? JSON.parse(text) : {};

      if (!response.ok) {
        return {
          status,
          error: responseData.detail || responseData.message || 'Error en la petición',
        };
      }

      return {
        status,
        data: responseData as T,
      };
    } catch (error: any) {
      console.error(`[API ERROR] ${method} ${endpoint}:`, error);
      return {
        status: 500,
        error: error.message || 'Error de conexión con el servidor',
      };
    }
  }

  public async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET', undefined, params);
  }

  public async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', body);
  }

  public async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PATCH', body);
  }

  public async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', body);
  }

  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE');
  }
}

export const apiClient = new ApiClient();
