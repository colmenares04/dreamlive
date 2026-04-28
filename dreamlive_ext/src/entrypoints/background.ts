import { browser } from "wxt/browser";
import { supabase } from "@/utils/supabase";

// Importamos los Servicios
import { SecurityService } from "@/services/security";
import { UpdaterService } from "@/services/updater";
import { BackstageService } from "@/services/backstage";
import { MessagingService } from "@/services/messaging";
import { LeadsService } from "@/services/leads";
import { licenseService } from "@/services/licenseService";
import { delay } from "./backstage.content/utils";

export default defineBackground(() => {
  console.log("🤖 DreamLive Background Service: Online (Modular)");

  // ==========================================
  // 1. INICIALIZACIÓN
  // ==========================================
  UpdaterService.checkForUpdates();
  SecurityService.performHeartbeat();
  BackstageService.init(); // Recupera estado si se reinició el navegador

  // ==========================================
  // 2. ALARMAS (CRON JOBS)
  // ==========================================
  browser.alarms.create("check_updates", { periodInMinutes: 30 });
  browser.alarms.create("security_heartbeat", { periodInMinutes: 0.5 }); // 30 seconds

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "check_updates") UpdaterService.checkForUpdates();
    if (alarm.name === "security_heartbeat") SecurityService.performHeartbeat();
  });

  // ==========================================
  // 3. CENTRAL DE MENSAJES
  // ==========================================
  browser.runtime.onMessage.addListener((message: any, sender) => {
    // --- A. BACKSTAGE (Comprobación de Disponibilidad) ---
    if (message.type === "START_CHECKING_BACKSTAGE") {
      // Validate license before starting
      (async () => {
        const validation = await licenseService.validateLicenseBeforeAction();
        if (!validation.isValid) {
          console.error("❌ License validation failed:", validation.error);
          browser.runtime
            .sendMessage({
              type: "LICENSE_VALIDATION_FAILED",
              error: validation.error,
            })
            .catch(() => {});
          return;
        }
        BackstageService.setRunningState(true);
      })();
      return true; // async keep-alive
    }
    if (message.type === "STOP_CHECKING") {
      BackstageService.setRunningState(false);
    }
    if (message.type === "BACKSTAGE_SCRIPT_READY") {
      BackstageService.processLoop();
    }
    if (message.type === "BATCH_PROCESSED") {
      (async () => {
        const storage = await browser.storage.local.get("savedLicense");
        const id = (storage.savedLicense as any)?.id;
        if (id) {
          await BackstageService.updateBatchResults(
            id,
            message.procesados,
            message.disponibles,
          );
          // 🛑 CAMBIO SOLICITADO: CONTINUAR SIN RECARGAR
          // 1. Buscamos siguiente lote
          if (id) {
            const nextBatch = await BackstageService.fetchBatchLeads(id, 30);

            if (nextBatch.length > 0) {
              // 2. Si hay más leads, enviamos mensaje a la MISMA pestaña
              const tabs = await browser.tabs.query({
                url: "*://live-backstage.tiktok.com/*",
              });
              if (tabs[0]?.id) {
                console.log(
                  `🔄 [BACKGROUND] Enviando siguiente lote de ${nextBatch.length} leads...`,
                );
                await delay(500);
                browser.tabs.sendMessage(tabs[0].id, {
                  type: "CHECK_BATCH_ON_PAGE",
                  users: nextBatch,
                  isContinuous: true, // Flag para indicar que continúe
                });
              }
            } else {
              // 3. Si no hay más, paramos
              console.log("🏁 [BACKGROUND] No hay más leads. Fin del proceso.");
              await BackstageService.setRunningState(false);
              browser.runtime
                .sendMessage({ type: "STOP_CHECKING_UI" })
                .catch(() => {});
              // Avisar a la pestaña que terminó
              const tabs = await browser.tabs.query({
                url: "*://live-backstage.tiktok.com/*",
              });
              if (tabs[0]?.id) {
                browser.tabs
                  .sendMessage(tabs[0].id, { type: "BACKSTAGE_ALL_DONE" })
                  .catch(() => {});
              }
            }
          }
        }
      })();
      return true; // async keep-alive
    }

    // --- B. MESSAGING (Envío de Mensajes) ---
    // 🛑 DETENER CONTACTO
    if (message.type === "STOP_CONTACTING") {
      MessagingService.stopContacting();
    }

    // 🟠 LÓGICA DE CONTACTO CON SISTEMA DE ENFRIAMIENTO (COOLDOWN)
    // 🟠 LÓGICA DE CONTACTO (Usando datos de la Licencia de Supabase)
    if (message.type === "START_CONTACTING") {
      // Validate license before starting
      (async () => {
        const validation = await licenseService.validateLicenseBeforeAction();
        if (!validation.isValid) {
          console.error("❌ License validation failed:", validation.error);
          browser.runtime
            .sendMessage({
              type: "LICENSE_VALIDATION_FAILED",
              error: validation.error,
            })
            .catch(() => {});
          return;
        }
        MessagingService.startContacting();
      })();
      return true; // async keep-alive
    }

    if (message.type === "CHECK_LIMIT_STATUS") {
      MessagingService.checkStatusForUI();
    }
    if (message.type === "LEAD_CONTACTED_SUCCESS") {
      MessagingService.markAsContacted(message.username);
    }
    if (message.type === "MESSAGES_PAGE_READY") {
      const batch = MessagingService.getPendingBatch();
      if (batch && sender.tab?.id) {
        browser.tabs.sendMessage(sender.tab.id, {
          type: "PROCESS_CONTACT_FLOW",
          ...batch,
        });
        MessagingService.clearPendingBatch();
      }
    }
    if (message.type === "DELETE_LEAD") {
      MessagingService.deleteLead(message.username);
    }
    if (message.type === "BATCH_COMPLETED") {
      console.log(`✅ Lote finalizado. Stats:`, message.stats);
    }

    // --- C. LEADS (Recopilación) ---
    if (message.type === "SAVE_LEAD") {
      // Validate license before saving
      (async () => {
        const validation = await licenseService.validateLicenseBeforeAction();
        if (!validation.isValid) {
          console.error("❌ License validation failed:", validation.error);
          browser.runtime
            .sendMessage({
              type: "LICENSE_VALIDATION_FAILED",
              error: validation.error,
            })
            .catch(() => {});
          return;
        }
        LeadsService.saveLead(message);
      })();
      return true;
    }

    // --- D. UTILIDADES EXTRAS ---
    if (message.type === "ROTATE_KEYWORD") {
      (async () => {
        try {
          const tabId = sender.tab?.id;
          if (!tabId) return;
          const storage = await browser.storage.local.get("savedLicense");
          const id = (storage.savedLicense as any)?.id;
          const { data } = await (supabase.from("licenses") as any)
            .select("keywords")
            .eq("id", id)
            .maybeSingle();

          const keywords = (data?.keywords || "")
            .split("/")
            .filter((k: string) => k.trim().length > 0);
          if (keywords.length === 0) return;

          const currentKeyword =
            new URL(sender.tab?.url || "").searchParams.get("q") || "";
          const nextIndex =
            (keywords.indexOf(currentKeyword) + 1) % keywords.length;

          browser.tabs.update(tabId, {
            url: `https://www.tiktok.com/search/live?q=${encodeURIComponent(keywords[nextIndex])}`,
          });
        } catch (e) {}
      })();
      return true;
    }
  });
});
