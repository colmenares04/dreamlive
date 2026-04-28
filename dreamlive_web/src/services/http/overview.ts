/**
 * OverviewAdapter — estadísticas generales para el administrador.
 */
import { http } from './apiClient';
import type { AdminOverview } from '../../core/entities';

export class OverviewAdapter {
  static async getAdminOverview(params?: { days?: number }): Promise<AdminOverview> {
    const { data } = await http.get<AdminOverview>('/overview/', { params });
    return data;
  }
}
