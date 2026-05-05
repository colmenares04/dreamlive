/**
 * LicenseAdapter — gestión de licencias (crear, listar, extender, config)
 */
import { http } from './apiClient';
import type { License, LicenseStatus } from '../../core/entities';

export class LicenseAdapter {
  static async list(filters?: { status?: LicenseStatus; agency_id?: string }): Promise<License[]> {
    const { data } = await http.get<License[]>('/licenses/', { params: filters });
    return data;
  }

  static async create(payload: {
    agency_id: string; recruiter_name?: string; days: number;
    quantity?: number; request_limit?: number; refresh_minutes?: number;
  }): Promise<any> {
    const { data } = await http.post('/licenses', payload);
    return data;
  }

  static async extend(licenseId: string, days: number): Promise<{ expires_at: string; days_remaining: number }> {
    const { data } = await http.patch(`/licenses/${licenseId}/extend`, { days });
    return data;
  }

  static async updateConfig(licenseId: string, payload: {
    recruiter_name?: string; request_limit?: number; refresh_minutes?: number; admin_password?: string; keywords?: string;
  }): Promise<void> {
    await http.patch(`/licenses/${licenseId}/config`, payload);
  }

  static async toggle(licenseId: string): Promise<{ status: LicenseStatus }> {
    const { data } = await http.patch(`/licenses/${licenseId}/toggle`);
    return data;
  }

  static async syncPasswords(password: string): Promise<{ updated_count: number }> {
    const { data } = await http.post('/licenses/sync-passwords', { password });
    return data;
  }

  static async getMetrics(agencyId?: string): Promise<Record<string, { today: number; total: number; last_ping: string | null }>> {
    const { data } = await http.get('/licenses/metrics', { params: { agency_id: agencyId } });
    return data;
  }

  static async remove(licenseId: string): Promise<void> {
    await http.delete(`/licenses/${licenseId}`);
  }

  static async updateDate(licenseId: string, date: string): Promise<void> {
    await http.patch(`/licenses/${licenseId}/date`, { new_date: date });
  }
}
