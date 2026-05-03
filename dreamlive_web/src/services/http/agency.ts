/**
 * AgencyAdapter — listado y gestión de agencias.
 */
import { http } from './apiClient';
import type { Agency } from '../../core/entities';

export class AgencyAdapter {
  static async list(activeOnly = false): Promise<Agency[]> {
    const { data } = await http.get<Agency[]>('/agencies/', {
      params: { active_only: activeOnly },
    });
    return data;
  }

  static async create(payload: { name: string; email?: string; password?: string; superagent?: string; admin_email?: string; admin_password?: string; code?: string; owner_id?: string }): Promise<Agency> {
    const { data } = await http.post<Agency>('/agencies/', payload);
    return data;
  }

  static async getStats(agencyId: string): Promise<any> {
    const { data } = await http.get(`/agencies/${agencyId}/stats`);
    return data;
  }

  static async remove(agencyId: string, password: string): Promise<void> {
    await http.delete(`/agencies/${agencyId}`, { data: { password } });
  }
}
