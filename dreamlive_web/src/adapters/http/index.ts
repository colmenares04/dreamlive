/**
 * Adaptadores HTTP – toda la comunicación con el backend FastAPI.
 * Usan axios con interceptores de JWT.
 */
import axios, { AxiosInstance } from 'axios';
import type {
  AuthTokens, User, Agency, License, LicenseStatus,
  Lead, PaginatedLeads, LeadStatus, AppVersion,
  AdminOverview, AgencyDashboard,
} from '../core/entities';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP CLIENT (axios con interceptores JWT)
// ═══════════════════════════════════════════════════════════════════════════════
class ApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL });

    // Adjuntar access_token automáticamente
    this.http.interceptors.request.use((config) => {
      const token = TokenStorage.getAccessToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Refresco automático al recibir 401
    this.http.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
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
const http = apiClient.instance;

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN STORAGE
// ═══════════════════════════════════════════════════════════════════════════════
export class TokenStorage {
  private static ACCESS = 'dl_access';
  private static REFRESH = 'dl_refresh';
  private static ROLE = 'dl_role';
  private static AGENCY = 'dl_agency';

  static save(tokens: AuthTokens): void {
    sessionStorage.setItem(this.ACCESS, tokens.access_token);
    sessionStorage.setItem(this.REFRESH, tokens.refresh_token);
    sessionStorage.setItem(this.ROLE, tokens.role);
    if (tokens.agency_id != null)
      sessionStorage.setItem(this.AGENCY, String(tokens.agency_id));
  }

  static getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS);
  }

  static getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH);
  }

  static getRole(): string | null {
    return sessionStorage.getItem(this.ROLE);
  }

  static getAgencyId(): string | null {
    return sessionStorage.getItem(this.AGENCY);
  }

  static clear(): void {
    sessionStorage.removeItem(this.ACCESS);
    sessionStorage.removeItem(this.REFRESH);
    sessionStorage.removeItem(this.ROLE);
    sessionStorage.removeItem(this.AGENCY);
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
export class AuthAdapter {
  static async login(email: string, password: string, captchaToken?: string): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/login', {
      email, password, captcha_token: captchaToken,
    });
    TokenStorage.save(data);
    return data;
  }

  static async loginAdmin(email: string, password: string, captchaToken?: string): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/users/login', {
      email, password, captcha_token: captchaToken,
    });
    TokenStorage.save(data);
    return data;
  }

  static async register(payload: {
    email: string; username: string; password: string;
    full_name?: string; role?: string; agency_id?: string;
  }): Promise<{ user_id: string }> {
    const { data } = await http.post('/auth/register', payload);
    return data;
  }

  static async requestPasswordReset(email: string): Promise<void> {
    await http.post('/auth/password-reset/request', { email });
  }

  static async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await http.post('/auth/password-reset/confirm', {
      token, new_password: newPassword,
    });
  }

  static async getMe(): Promise<User> {
    const { data } = await http.get<User>('/auth/me');
    return data;
  }

  static logout(): void {
    TokenStorage.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LICENSE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
export class LicenseAdapter {
  static async list(filters?: { status?: LicenseStatus; agency_id?: string }): Promise<License[]> {
    const { data } = await http.get<License[]>('/licenses', { params: filters });
    return data;
  }

  static async create(payload: {
    agency_id: string; recruiter_name: string; days: number;
    request_limit?: number; refresh_minutes?: number;
  }): Promise<{ id: string; key: string; expires_at: string }> {
    const { data } = await http.post('/licenses', payload);
    return data;
  }

  static async extend(licenseId: string, days: number): Promise<{ expires_at: string; days_remaining: number }> {
    const { data } = await http.patch(`/licenses/${licenseId}/extend`, { days });
    return data;
  }

  static async toggle(licenseId: string): Promise<{ status: LicenseStatus }> {
    const { data } = await http.patch(`/licenses/${licenseId}/toggle`);
    return data;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENCY ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
export class AgencyAdapter {
  static async list(activeOnly = false): Promise<Agency[]> {
    const { data } = await http.get<Agency[]>('/agencies', {
      params: { active_only: activeOnly },
    });
    return data;
  }

  static async create(payload: { name: string; code: string; owner_id?: string }): Promise<Agency> {
    const { data } = await http.post<Agency>('/agencies', payload);
    return data;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
export class LeadAdapter {
  static async list(params: {
    page?: number; page_size?: number; status?: LeadStatus;
    license_id?: string; search?: string;
  }): Promise<PaginatedLeads> {
    const { data } = await http.get<PaginatedLeads>('/leads', { params });
    return data;
  }

  static async purge(): Promise<{ deleted: number }> {
    const { data } = await http.post('/leads/purge');
    return data;
  }

  static async exportRaw(): Promise<Record<string, string>[]> {
    const { data } = await http.get('/leads/export');
    return data;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
export class VersionAdapter {
  static async list(): Promise<AppVersion[]> {
    const { data } = await http.get<AppVersion[]>('/versions');
    return data;
  }

  static async publish(payload: {
    version_number: string; changelog: string; tags: string[];
    windows_url: string; windows_size_kb: number;
    macos_url: string; macos_size_kb: number;
  }): Promise<{ published: number; version: string }> {
    const { data } = await http.post('/versions/publish', payload);
    return data;
  }

  static async activate(versionId: string): Promise<void> {
    await http.patch(`/versions/${versionId}/activate`);
  }

  static async remove(versionId: string): Promise<void> {
    await http.delete(`/versions/${versionId}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════════
export class OverviewAdapter {
  static async getAdminOverview(): Promise<AdminOverview> {
    const { data } = await http.get<AdminOverview>('/overview');
    return data;
  }
}

export class DashboardAdapter {
  static async getAgencyDashboard(): Promise<AgencyDashboard> {
    const { data } = await http.get<AgencyDashboard>('/dashboard');
    return data;
  }
}
