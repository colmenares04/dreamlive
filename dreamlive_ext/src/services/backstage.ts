import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";

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
        url: "*://live-backstage.tiktok.com/*",
      });
      if (tabs[0]?.id) {
        browser.tabs
          .sendMessage(tabs[0].id, { type: "ABORT_CHECKING_FLOW" })
          .catch(() => {});
      }
    }
  },

  async init() {
    const res = await browser.storage.local.get("isBackstageRunning");
    isCheckingBackstage = !!res.isBackstageRunning;
    if (isCheckingBackstage) setTimeout(() => this.processLoop(), 2000);
  },

  async fetchBatchLeads(licenseId: string, limit = 30) {
    const { data, error } = await supabase
      .from("tiktok_leads")
      .select("username")
      .eq("license_id", licenseId)
      .eq("status", "recopilado")
      .limit(limit);
    if (error) return [];
    return ((data as any[]) || []).map((d) => d.username);
  },

  async updateBatchResults(
    licenseId: string,
    all: string[],
    availables: string[],
  ) {
    if (availables.length > 0) {
      await (supabase.from("tiktok_leads") as any)
        .update({ status: "disponible", verified_at: new Date().toISOString() })
        .eq("license_id", licenseId)
        .in("username", availables);
    }
    const discarded = all.filter((u) => !availables.includes(u));
    if (discarded.length > 0) {
      await (supabase.from("tiktok_leads") as any)
        .delete()
        .eq("license_id", licenseId)
        .in("username", discarded);
    }
  },

  async processLoop() {
    console.log("🕵️‍♂️ [DEBUG] Backstage Loop iniciado...");
    const state = await browser.storage.local.get("isBackstageRunning");
    if (!state.isBackstageRunning) {
      isCheckingBackstage = false;
      return;
    }

    const storage = await browser.storage.local.get("savedLicense");
    const licenseUUID = (storage.savedLicense as any)?.id;
    if (!licenseUUID) return;

    // 1. Obtenemos lote
    const batch = await this.fetchBatchLeads(licenseUUID, 30);

    // 2. Buscamos pestaña
    const tabs = await browser.tabs.query({
      url: "*://live-backstage.tiktok.com/*",
    });
    const backstageTab = tabs[0];
    const targetPath = "/portal/anchor/relation";
    const targetUrl = "https://live-backstage.tiktok.com" + targetPath;

    // --- CASO 1: FIN DE CAMPAÑA ---
    if (batch.length === 0) {
      console.log("🏁 Backstage: No hay más leads.");
      await this.setRunningState(false);
      browser.runtime.sendMessage({ type: "STOP_CHECKING_UI" }).catch(() => {});
      if (backstageTab?.id) {
        browser.tabs
          .sendMessage(backstageTab.id, { type: "BACKSTAGE_ALL_DONE" })
          .catch(() => {});
      }
      return;
    }

    // --- CASO 2: GESTIÓN DE PESTAÑA ---
    if (backstageTab?.id) {
      console.log(`🔎 [DEBUG] Pestaña encontrada: ${backstageTab.url}`);

      // A. YA EXISTE LA PESTAÑA
      // Verificamos si la URL es correcta (flexible)
      const isCorrectPage = backstageTab.url?.includes(targetPath);

      if (isCorrectPage) {
        console.log("✅ [DEBUG] URL Correcta. Intentando enviar mensaje...");

        // ESTAMOS EN EL LUGAR CORRECTO
        try {
          await browser.tabs.sendMessage(backstageTab.id, {
            type: "CHECK_BATCH_ON_PAGE",
            users: batch,
          });
          console.log("📨 [DEBUG] Mensaje enviado exitosamente. FIN DEL LOOP.");
          return; //
        } catch (e: any) {
          console.warn(`⚠️ [DEBUG] Falló sendMessage: ${e.message}`);
          console.warn(
            "🛑 [DEBUG] FRENO DE EMERGENCIA: No recargaré la página. Esperando siguiente ciclo...",
          );
          return;
        }
      } else {
        console.log("🔄 [DEBUG] URL Incorrecta. Redirigiendo...");
        console.log(`   - Actual: ${backstageTab.url}`);
        console.log(`   - Objetivo: ${targetPath}`);

        await browser.tabs.update(backstageTab.id, {
          url: targetUrl,
          active: true,
        });
        return;
      }
    } else {
      // --- CASO 3: NO EXISTE PESTAÑA -> ABRIMOS ---
      console.log("✨ [DEBUG] Abriendo nueva pestaña...");
      await browser.tabs.create({ url: targetUrl });
    }
  },
};
