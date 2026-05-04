import { browser } from 'wxt/browser';
import { apiClient } from '../../../infrastructure/api/apiClient';

/**
 * KeywordsService
 * Gestiona el almacenamiento y sincronización de palabras clave desde el servidor.
 */
export const KeywordsService = {
  /**
   * Obtiene la ID de la licencia actual desde el storage.
   */
  async getLicenseId(): Promise<string | null> {
    const res = await browser.storage.local.get('license');
    return (res.license as any)?.id || null;
  },

  /**
   * Obtiene la lista de palabras clave desde la API.
   */
  async getKeywords(): Promise<string[]> {
    const licenseId = await this.getLicenseId();
    if (!licenseId) return [];

    try {
      // Limpiar caché antes de pedir la nueva para evitar fantasmas
      await browser.storage.local.remove('keywords');
      
      const res = await apiClient.get<any>(`/leads/keywords?license_id=${licenseId}`);
      if (res.data && res.data.items) {
        await browser.storage.local.set({ keywords: res.data.items });
        return res.data.items;
      }
    } catch (e) {
      console.error('Error fetching keywords from API, using cache:', e);
    }

    // Fallback a caché local si la API falla
    const cached = await browser.storage.local.get('keywords');
    return (cached.keywords as string[]) || [];
  },

  /**
   * Obtiene la palabra clave activa.
   */
  async getActiveKeyword(): Promise<string> {
    const res = await browser.storage.local.get('activeKeyword');
    return (res.activeKeyword as string) || 'gaming';
  },

  /**
   * Guarda una nueva palabra clave en el servidor.
   */
  async addKeyword(keyword: string): Promise<string[]> {
    const licenseId = await this.getLicenseId();
    const clean = keyword.trim().toLowerCase();
    if (!licenseId || !clean) return this.getKeywords();

    try {
      await apiClient.post('/leads/keywords', { 
        license_id: licenseId, 
        term: clean 
      });
      // Forzar recarga desde servidor para asegurar sincronía
      const updated = await this.getKeywords();
      browser.runtime.sendMessage({ type: 'KEYWORDS_UPDATED', payload: updated });
      return updated;
    } catch (e) {
      console.error('Error adding keyword:', e);
      return this.getKeywords();
    }
  },

  /**
   * Elimina una palabra clave del servidor.
   */
  async removeKeyword(keyword: string): Promise<string[]> {
    const licenseId = await this.getLicenseId();
    if (!licenseId) return this.getKeywords();

    try {
      await apiClient.delete(`/leads/keywords/${encodeURIComponent(keyword)}?license_id=${licenseId}`);
      const updated = await this.getKeywords();
      browser.runtime.sendMessage({ type: 'KEYWORDS_UPDATED', payload: updated });
      return updated;
    } catch (e) {
      console.error('Error removing keyword:', e);
      return this.getKeywords();
    }
  },

  /**
   * Intenta navegar a una keyword usando el buscador de la página sin refrescar.
   */
  async navigateToKeywordInline(keyword: string): Promise<boolean> {
    try {
      // Usar selectores basados exactamente en el HTML proporcionado
      const searchInput = document.querySelector('input[name="q"]') as HTMLInputElement;
      const searchForm = document.querySelector('form[data-e2e="search-box"]') as HTMLFormElement;

      if (searchInput) {
        const input = searchInput as HTMLInputElement;
        
        // 1. Establecer valor
        input.value = keyword;
        
        // 2. Disparar eventos para que React se entere
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // 3. Simular Enter o Submit
        if (searchForm) {
          searchForm.dispatchEvent(new Event('submit', { bubbles: true }));
          // TikTok a veces necesita el submit real
          const submitBtn = searchForm.querySelector('button[type="submit"]');
          if (submitBtn) (submitBtn as HTMLElement).click();
          else searchForm.submit();
        } else {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }
        
        return true;
      }
    } catch (e) {
      console.error('Error in inline navigation:', e);
    }
    return false;
  },

  /**
   * Establece la palabra clave activa y prepara la URL.
   */
  async setActiveKeyword(keyword: string) {
    await browser.storage.local.set({ activeKeyword: keyword });
    
    // Intentar navegación inline primero
    const success = await this.navigateToKeywordInline(keyword);
    
    const searchUrl = `https://www.tiktok.com/search/live?q=${encodeURIComponent(keyword)}`;
    browser.runtime.sendMessage({ type: 'KEYWORD_CHANGED', payload: keyword });
    
    return { url: searchUrl, inline: success };
  }
};
