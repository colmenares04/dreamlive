/**
 * AuditAdapter — consulta de logs de auditoría.
 */
import { http } from './apiClient';
import type { AuditLog } from '../../core/entities/settings';

export class AuditAdapter {
  static async list(filters?: { category?: string; agency_id?: string; limit?: number }): Promise<AuditLog[]> {
    const { data } = await http.get<AuditLog[]>('/audit/', { params: filters });
    return data;
  }
}
