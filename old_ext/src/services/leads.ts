import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";

export const LeadsService = {
  async saveLead(message: any) {
    try {
      const storage = await browser.storage.local.get("savedLicense");
      const licenseUUID = (storage.savedLicense as any)?.id;

      if (!licenseUUID) {
        console.error("❌ ERROR CRÍTICO: No se encontró ID de licencia.");
        return;
      }

      const { error } = await (supabase.from("tiktok_leads") as any).upsert(
        {
          license_id: licenseUUID,
          username: message.username,
          status: "recopilado",
          captured_at: new Date().toISOString(),
          viewer_count: message.viewers || 0,
          likes_count: message.likes || 0, // Nuevo
          source: message.source || "unknown",
        },
        { onConflict: "license_id, username", ignoreDuplicates: true },
      );

      if (!error) {
        browser.runtime
          .sendMessage({ type: "LEAD_SAVED_CONFIRMATION" })
          .catch(() => {});
      } else {
        console.error("❌ Error guardando lead en Supabase:", error);
      }
    } catch (err) {
      console.error("Excepción en SAVE_LEAD:", err);
    }
  },
};
