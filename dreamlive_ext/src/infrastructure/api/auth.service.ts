import { apiClient, ApiResponse } from './apiClient';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  agency_id: string | null;
  license_id: string | null;
  status: string;
  logo_url?: string;
}

export interface License {
  id: string;
  key: string;
  status: string;
  expiration_date?: string;
  max_devices?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  user_id: string;
  agency_id: string | null;
}

export interface LoginLicenseData {
  license: License;
  hasAdminUser: boolean;
  token: string;
  session_id: string;
}

export class AuthService {
  /**
   * Inicia sesión con email y contraseña para la extensión. Retorna tokens de acceso y licencia.
   */
  static async loginExtension(email: string, password: string): Promise<ApiResponse<LoginLicenseData>> {
    return apiClient.post<LoginLicenseData>('/auth/login-extension', { 
      email, 
      password,
      device_id: 'extension_browser',
      browser: 'chrome',
      os: 'windows'
    });
  }

  /**
   * Obtiene los datos del perfil actual usando el token de acceso.
   */
  static async getMe(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  }

  /**
   * Inicia sesión directamente con una llave de licencia.
   */
  static async loginWithLicense(licenseKey: string): Promise<ApiResponse<LoginLicenseData>> {
    return apiClient.post<LoginLicenseData>('/auth/login-license', { 
      licenseKey,
      device_id: 'extension_browser', // Podría ser más dinámico
      browser: 'chrome',
      os: 'windows'
    });
  }

  /**
   * Vincula una cuenta (email, contraseña, nombre) a una licencia existente.
   */
  static async linkLicense(data: { licenseKey: string, email: string, password: string, fullName: string }): Promise<ApiResponse<LoginLicenseData>> {
    return apiClient.post<LoginLicenseData>('/auth/link-license', {
      ...data,
      device_id: 'extension_browser',
      browser: 'chrome',
      os: 'windows'
    });
  }
}
