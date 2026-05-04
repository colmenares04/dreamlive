import { browser } from 'wxt/browser';
import { apiClient } from '../../../infrastructure/api/apiClient';
import { Lead } from './types';

export const LeadsService = {
  /**
   * Guarda un nuevo lead recopilado en el backend.
   * Usamos /leads/ con barra final para evitar redirecciones 307.
   */
  async saveLead(message: any) {
    try {
      let licenseId = message.license_id;
      
      // Fallback de seguridad: si no viene el ID, lo buscamos en el storage
      if (!licenseId) {
        let license = await browser.storage.local.get('license');
        licenseId = (license.license as any)?.id;
      }

      if (!licenseId) {
        console.error('❌ No se puede guardar el lead: Falta license_id');
        return;
      }

      const payload: any = {
        license_id: licenseId,
        username: message.username,
        status: 'recopilado',
        viewer_count: message.viewers || 0,
        likes_count: message.likes || 0,
        source: message.source || 'unknown',
      };

      const response = await apiClient.post('/leads/', payload);

      if (!response.error) {
        browser.runtime
          .sendMessage({ 
            type: 'LEAD_SAVED_CONFIRMATION', 
            payload: { 
              ...payload, 
              id: (response.data as any)?.id || 'temp-' + Date.now(), 
              created_at: new Date().toISOString() 
            } 
          })
          .catch(() => {});
      } else {
        console.error('❌ Error guardando lead en API:', response.error);
      }
    } catch (err) {
      console.error('Excepción en SAVE_LEAD:', err);
    }
  },

  async getLeads(status: string, page: number = 1, pageSize: number = 100, search: string = '') {
    const url = `/leads/?status=${status}&page=${page}&page_size=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const res = await apiClient.get<any>(url);
    if (res.error) throw new Error((res.error as any).detail || 'Error fetching leads');
    return res.data;
  },

  async deleteLead(id: string) {
    const resL = await browser.storage.local.get('license');
    const licId = (resL.license as any)?.id;
    if (!licId) throw new Error('No license active');

    const res = await apiClient.delete<any>(`/leads/${id}?license_id=${licId}`);
    if (res.error) throw new Error((res.error as any).detail || 'Error deleting lead');
    return true;
  },

  async clearLeads(status: string) {
    const resL = await browser.storage.local.get('license');
    const licId = (resL.license as any)?.id;
    if (!licId) throw new Error('No license active');

    const res = await apiClient.post<any>(`/leads/purge?status=${status}&license_id=${licId}`, {});
    if (res.error) throw new Error((res.error as any).detail || 'Error clearing leads');
    return true;
  }
};
