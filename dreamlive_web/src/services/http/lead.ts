/**
 * LeadAdapter — operaciones sobre leads: paginado, export, purge.
 */
import { http } from './apiClient';
import type { PaginatedLeads, LeadStatus, Lead } from '../../core/entities';

export class LeadAdapter {
  static async list(params: {
    page?: number; page_size?: number; status?: LeadStatus;
    license_id?: string; search?: string;
    min_viewers?: number; min_likes?: number;
    agency_id?: string;
  }): Promise<PaginatedLeads> {
    const { data } = await http.get<PaginatedLeads>('/leads/', { params });
    return data;
  }

  static async purge(params?: { status?: string; license_id?: string }): Promise<{ deleted: number }> {
    const { data } = await http.post('/leads/purge', null, { params });
    return data;
  }

  static async delete(leadId: string): Promise<void> {
    await http.delete(`/leads/${leadId}`);
  }

  static async exportRaw(): Promise<Record<string, string>[]> {
    const { data } = await http.get('/leads/export');
    return data;
  }
}
