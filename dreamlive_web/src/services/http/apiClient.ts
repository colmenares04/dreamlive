/**
 * ApiClient — axios wrapper with JWT interceptors.
 *
 * Exports:
 * - `apiClient`: ApiClient instance
 * - `http`: underlying AxiosInstance
 */
import axios, { AxiosInstance } from 'axios';
import { TokenStorage } from './tokenStorage';
import type { AuthTokens } from '../../core/entities';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://217.216.94.178:8000/api/v1';

class ApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Attach access token / agency token automatically
    this.http.interceptors.request.use((config) => {
      const token = TokenStorage.getAccessToken();
      const agencyToken = TokenStorage.getAgencyToken();
      if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      } else if (agencyToken) {
        (config.headers as any).Authorization = `Bearer ${agencyToken}`;
      }
      return config;
    });

    // Auto-refresh on 401 (skip /auth/ endpoints)
    this.http.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
        const isAuthRoute = original?.url?.includes('/auth/');

        if (isAuthRoute) return Promise.reject(error);

        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const refreshToken = TokenStorage.getRefreshToken();
            if (!refreshToken) throw new Error('Sin refresh token');
            const { data } = await axios.post<AuthTokens>(
              `${BASE_URL}/auth/refresh`,
              { refresh_token: refreshToken }
            );
            TokenStorage.save(data);
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return this.http(original);
          } catch {
            TokenStorage.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get instance() { return this.http; }
}

export const apiClient = new ApiClient();
export const http = apiClient.instance;
