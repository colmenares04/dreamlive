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
 * Implementa un patrón Singleton para mantener una única configuración base.
 */
class ApiClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.WXT_API_BASE_URL || 'http://localhost:8000/api/v1';
  }

  /**
   * Método core para realizar peticiones. Centraliza headers, auth y manejo de errores.
   */
  private async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT', 
    body?: any,
    params?: Record<string, string>
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
      
      if (status === 204) {
        return { status, data: {} as T };
      }

      // Intentar parsear JSON solo si hay contenido
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

// Exportamos una instancia única para toda la aplicación (Singleton)
export const apiClient = new ApiClient();
