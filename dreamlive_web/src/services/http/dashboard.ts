/**
 * DashboardAdapter — métricas específicas de agencia.
 */
import { http } from './apiClient';
import type { AgencyDashboard } from '../../core/entities';

export class DashboardAdapter {
  static async getAgencyDashboard(params?: { days?: number; agency_id?: string }): Promise<AgencyDashboard> {
    const { data } = await http.get<AgencyDashboard>('/dashboard/', { params });
    return data;
  }
}
