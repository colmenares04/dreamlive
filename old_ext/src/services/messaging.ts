import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";

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
    console.log("Orden de detención recibida.");
    isProcessRunning = false;
    pendingContactBatch = null;

    // Buscamos la pestaña activa de mensajes para mandarle la orden de abortar
    const tabs = await browser.tabs.query({
      url: "*://live-backstage.tiktok.com/portal/anchor/instant-messages*",
    });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: "ABORT_CONTACT_FLOW",
      });
    }
  },
  async deleteLead(username: string) {
    const storage = await browser.storage.local.get(["savedLicense"]);
    const license = storage.savedLicense as any;

    if (!license?.id) return;

    // Ejecutamos el DELETE
    const { error } = await (supabase.from("tiktok_leads") as any)
      .delete()
      .eq("license_id", license.id)
      .eq("username", username);

    if (error) {
      console.error(`❌ Error al eliminar usuario ${username}:`, error);
    } else {
      console.log(
        `🗑️ Usuario ${username} eliminado de la base de datos (Historial previo).`,
      );
    }
  },
  async startContacting() {
    const storage = await browser.storage.local.get(["savedLicense"]);
    const license = storage.savedLicense as any;
    if (!license?.id || !license?.key)
      return console.error("❌ No hay licencia activa.");
    // 1. Configuración y Límites
    const limit = license.limitRequests || 60;
    const refreshMinutes = license.refreshMinutes || 720;
    const timeWindowStart = new Date();
    timeWindowStart.setMinutes(timeWindowStart.getMinutes() - refreshMinutes);

    isProcessRunning = true;

    // 2. Consultar Historial
    const { data: history } = await (supabase.from("tiktok_leads") as any)
      .select("contacted_at")
      .eq("license_id", license.id)
      .eq("status", "contactado")
      .gte("contacted_at", timeWindowStart.toISOString())
      .order("contacted_at", { ascending: false });

    const enviadosEnCiclo = history?.length || 0;
    const ultimoEnvio =
      history && history.length > 0 ? new Date(history[0].contacted_at) : null;

    // 3. Verificar Bloqueo (Cooldown)
    if (enviadosEnCiclo >= limit) {
      let horaDesbloqueo = new Date();
      if (ultimoEnvio) {
        horaDesbloqueo = new Date(
          ultimoEnvio.getTime() + refreshMinutes * 60000,
        );
      }

      const faltanMs = horaDesbloqueo.getTime() - new Date().getTime();

      if (faltanMs > 0) {
        const horas = Math.floor(faltanMs / (1000 * 60 * 60));
        const min = Math.floor((faltanMs % (1000 * 60 * 60)) / (1000 * 60));

        browser.runtime
          .sendMessage({
            type: "LIMIT_REACHED",
            count: enviadosEnCiclo,
            limit: limit,
            resetIn: `${horas}h ${min}m`,
          })
          .catch(() => { });

        return; // STOP
      }
    }

    // 4. Preparar Lote (Con Buffer de Over-fetching)
    const restantes = limit - enviadosEnCiclo;

    // Traemos un buffer extra (ej: 40) para compensar los saltados/errores
    // Pero nunca traemos más de lo que haya en DB disponible
    const bufferSize = 40;
    const fetchLimit = bufferSize;

    const { data: leads } = await (supabase.from("tiktok_leads") as any)
      .select("username")
      .eq("license_id", license.id)
      .eq("status", "disponible")
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(fetchLimit);

    const { data: licData } = await (supabase.from("licenses") as any)
      .select("message_templates")
      .eq("license_key", license.key)
      .single();

    if (!leads?.length || !licData?.message_templates?.length) {
      console.log("No hay leads o plantillas.");
      return;
    }

    // Debugging: See what templates come from Supabase
    console.log("[SUPABASE DEBUG] ==================");
    console.log(
      "[SUPABASE DEBUG] message_templates raw:",
      licData.message_templates,
    );
    console.log(
      "[SUPABASE DEBUG] message_templates type:",
      typeof licData.message_templates,
    );
    console.log(
      "[SUPABASE DEBUG] message_templates es array?",
      Array.isArray(licData.message_templates),
    );
    console.log(
      "[SUPABASE DEBUG] message_templates length:",
      licData.message_templates?.length,
    );
    console.log("[SUPABASE DEBUG] ==================");

    const batch = {
      leads: leads.map((l: any) => l.username),
      templates: licData.message_templates,
      targetSuccessCount: restantes, // 🎯 Meta real para este ciclo
    };
    const targetUrl =
      "https://live-backstage.tiktok.com/portal/anchor/instant-messages";

    // 5. Ejecutar
    const tabs = await browser.tabs.query({
      url: "*://live-backstage.tiktok.com/portal/anchor/instant-messages*",
    });
    const existingTab = tabs[0];

    if (existingTab?.id) {
      await browser.tabs.update(existingTab.id, { active: true });
      if (existingTab.url?.includes(targetUrl)) {
        browser.tabs
          .sendMessage(existingTab.id, {
            type: "PROCESS_CONTACT_FLOW",
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
    const storage = await browser.storage.local.get("savedLicense");
    const license = storage.savedLicense as any;
    if (!license?.id) return;

    const limit = license.limitRequests || 50;
    const refreshMinutes = license.refreshMinutes || 720;
    const timeWindowStart = new Date();
    timeWindowStart.setMinutes(timeWindowStart.getMinutes() - refreshMinutes);

    const { data: history } = await (supabase.from("tiktok_leads") as any)
      .select("contacted_at")
      .eq("license_id", license.id)
      .eq("status", "contactado")
      .gte("contacted_at", timeWindowStart.toISOString())
      .order("contacted_at", { ascending: false });

    const enviadosEnCiclo = history?.length || 0;
    const ultimoEnvio =
      history && history.length > 0 ? new Date(history[0].contacted_at) : null;

    if (enviadosEnCiclo >= limit) {
      let horaDesbloqueo = new Date();
      if (ultimoEnvio)
        horaDesbloqueo = new Date(
          ultimoEnvio.getTime() + refreshMinutes * 60000,
        );
      const faltanMs = horaDesbloqueo.getTime() - new Date().getTime();

      if (faltanMs > 0) {
        const horas = Math.floor(faltanMs / (1000 * 60 * 60));
        const min = Math.floor((faltanMs % (1000 * 60 * 60)) / (1000 * 60));
        browser.runtime
          .sendMessage({
            type: "LIMIT_REACHED",
            count: enviadosEnCiclo,
            limit,
            resetIn: `${horas}h ${min}m`,
          })
          .catch(() => { });
      }
    }
  },

  async markAsContacted(username: string) {
    const storage = await browser.storage.local.get("savedLicense");
    const licenseId = (storage.savedLicense as any)?.id;
    if (licenseId) {
      await (supabase.from("tiktok_leads") as any)
        .update({
          status: "contactado",
          contacted_at: new Date().toISOString(),
        })
        .eq("license_id", licenseId)
        .eq("username", username);
    }
  },
};
