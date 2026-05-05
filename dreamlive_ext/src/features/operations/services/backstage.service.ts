import { browser } from 'wxt/browser';
import { apiClient } from '../../../infrastructure/api/apiClient';
import { Lead } from './types';

// Estado interno del módulo
let isCheckingBackstage = false;

export const BackstageService = {
  async setRunningState(state: boolean) {
    isCheckingBackstage = state;
    await browser.storage.local.set({ isBackstageRunning: state });

    if (state) {
      this.processLoop();
    } else {
      // 🛑 ENVIAR SEÑAL DE DETENCIÓN AL CONTENT SCRIPT
      const tabs = await browser.tabs.query({
        url: '*://live-backstage.tiktok.com/*',
      });
      if (tabs[0]?.id) {
        browser.tabs
          .sendMessage(tabs[0].id, { type: 'ABORT_CHECKING_FLOW' })
          .catch(() => { });
      }
    }
  },

  async init() {
    const res = await browser.storage.local.get('isBackstageRunning');
    isCheckingBackstage = !!(res as any).isBackstageRunning;
    if (isCheckingBackstage) setTimeout(() => this.processLoop(), 2000);
  },

  async fetchBatchLeads(tag?: string, limit = 30): Promise<string[]> {
    const tagQuery = tag ? `&tag=${encodeURIComponent(tag)}` : '';
    // El backend espera page_size (o limit por el alias que añadimos)
    const res = await apiClient.get<any>(`/leads/?status=recopilado&page_size=${limit}${tagQuery}`);

    if (res.error || !res.data || !Array.isArray(res.data.items)) {
      console.warn('[BackstageService] No se pudo obtener el lote de leads o formato inválido:', res);
      return [];
    }

    return res.data.items.map((l: any) => l.username);
  },

  async updateBatchResults(all: string[], availables: string[]) {
    const discarded = all.filter((u) => !availables.includes(u));

    // Delegamos la lógica compleja de batch update/delete al backend
    // No usamos barra final para evitar redirección CORS
    await apiClient.post('/leads/batch-process', {
      availables,
      discarded
    });
  },

  async processLoop() {
    console.log('🕵️‍♂️ [DEBUG] Backstage Loop iniciado...');
    const state = await browser.storage.local.get('isBackstageRunning');
    if (!(state as any).isBackstageRunning) {
      isCheckingBackstage = false;
      return;
    }

    // 1. Obtenemos lote
    const batch = await this.fetchBatchLeads(undefined, 30);

    // 2. Buscamos pestaña
    const tabs = await browser.tabs.query({
      url: '*://live-backstage.tiktok.com/*',
    });
    const backstageTab = tabs[0];
    const targetPath = '/portal/anchor/relation';
    const targetUrl = 'https://live-backstage.tiktok.com' + targetPath;

    // --- CASO 1: FIN DE CAMPAÑA ---
    if (batch.length === 0) {
      console.log('🏁 Backstage: No hay más leads.');
      await this.setRunningState(false);
      browser.runtime.sendMessage({ type: 'STOP_CHECKING_UI' }).catch(() => { });
      if (backstageTab?.id) {
        browser.tabs
          .sendMessage(backstageTab.id, { type: 'BACKSTAGE_ALL_DONE' })
          .catch(() => { });
      }
      return;
    }

    // --- CASO 2: GESTIÓN DE PESTAÑA ---
    if (backstageTab?.id && backstageTab.url) {
      console.log(`🔎 [DEBUG] Pestaña encontrada: ${backstageTab.url}`);

      const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const isCorrectPage = normalize(backstageTab.url).includes(normalize(targetPath));

      if (isCorrectPage) {
        console.log('✅ [DEBUG] URL Correcta. Intentando enviar mensaje...');

        try {
          await browser.tabs.sendMessage(backstageTab.id, {
            type: 'CHECK_BATCH_ON_PAGE',
            users: batch,
          });
          console.log('📨 [DEBUG] Mensaje enviado exitosamente. FIN DEL LOOP.');
          return;
        } catch (e: any) {
          console.warn(`⚠️ [DEBUG] Falló sendMessage: ${e.message}`);
          console.warn('🛑 [DEBUG] FRENO DE EMERGENCIA: No recargaré la página. Esperando siguiente ciclo...');
          return;
        }
      } else {
        console.log('🔄 [DEBUG] URL Incorrecta. Redirigiendo...');
        await browser.tabs.update(backstageTab.id, {
          url: targetUrl,
          active: true,
        });
        return;
      }
    } else {
      // --- CASO 3: NO EXISTE PESTAÑA -> ABRIMOS ---
      console.log('✨ [DEBUG] Abriendo nueva pestaña...');
      await browser.tabs.create({ url: targetUrl });
    }
  },
};
