import { browser } from 'wxt/browser';
import { apiClient } from '../../../infrastructure/api/apiClient';
import { Lead, LimitCheckResponse, LicenseTemplates } from './types';

let pendingContactBatch: any = null;
let isProcessRunning = false;

export const MessagingService = {
  getPendingBatch() {
    return pendingContactBatch;
  },

  clearPendingBatch() {
    pendingContactBatch = null;
  },

  async stopContacting() {
    console.log('Orden de detención recibida.');
    isProcessRunning = false;
    pendingContactBatch = null;

    const tabs = await browser.tabs.query({
      url: '*://live-backstage.tiktok.com/portal/anchor/instant-messages*',
    });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: 'ABORT_CONTACT_FLOW',
      });
    }
  },

  async deleteLead(username: string) {
    const { error } = await apiClient.delete(`/leads/${username}`);
    
    if (error) {
      console.error(`❌ Error al eliminar usuario ${username}:`, error);
    } else {
      console.log(`🗑️ Usuario ${username} eliminado de la base de datos (Historial previo).`);
    }
  },

  async startContacting() {
    isProcessRunning = true;

    // 1. Check limits via API instead of raw DB queries
    const limitsRes = await apiClient.get<LimitCheckResponse>('/operations/limits');
    if (limitsRes.data && !limitsRes.data.allowed) {
      browser.runtime
        .sendMessage({
          type: 'LIMIT_REACHED',
          count: limitsRes.data.count,
          limit: limitsRes.data.limit,
          resetIn: limitsRes.data.reset_in,
        })
        .catch(() => {});
      return; // STOP
    }

    const restantes = limitsRes.data ? (limitsRes.data.limit - limitsRes.data.count) : 50;

    // 2. Fetch available leads
    const leadsRes = await apiClient.get<Lead[]>('/leads?status=disponible&limit=40');
    
    // 3. Fetch templates
    const templatesRes = await apiClient.get<LicenseTemplates>('/licenses/templates');

    const leads = leadsRes.data;
    const licData = templatesRes.data;

    if (!leads?.length || !licData?.message_templates?.length) {
      console.log('No hay leads o plantillas disponibles.');
      return;
    }

    const batch = {
      leads: leads.map((l: Lead) => l.username),
      templates: licData.message_templates,
      targetSuccessCount: restantes,
    };
    const targetUrl = 'https://live-backstage.tiktok.com/portal/anchor/instant-messages';

    // 4. Ejecutar
    const tabs = await browser.tabs.query({
      url: '*://live-backstage.tiktok.com/portal/anchor/instant-messages*',
    });
    const existingTab = tabs[0];

    if (existingTab?.id) {
      await browser.tabs.update(existingTab.id, { active: true });
      if (existingTab.url?.includes(targetUrl)) {
        browser.tabs
          .sendMessage(existingTab.id, {
            type: 'PROCESS_CONTACT_FLOW',
            ...batch,
          })
          .catch(() => browser.tabs.reload(existingTab.id!));
      } else {
        pendingContactBatch = batch;
        await browser.tabs.update(existingTab.id, { url: targetUrl });
      }
    } else {
      pendingContactBatch = batch;
      await browser.tabs.create({ url: targetUrl });
    }
  },

  // Chequeo silencioso para la UI (Popup)
  async checkStatusForUI() {
    const limitsRes = await apiClient.get<LimitCheckResponse>('/operations/limits');
    if (limitsRes.data && !limitsRes.data.allowed) {
      browser.runtime
        .sendMessage({
          type: 'LIMIT_REACHED',
          count: limitsRes.data.count,
          limit: limitsRes.data.limit,
          resetIn: limitsRes.data.reset_in,
        })
        .catch(() => {});
    }
  },

  async markAsContacted(username: string) {
    await apiClient.patch(`/leads/${username}`, {
      status: 'contactado'
    });
  },
};
