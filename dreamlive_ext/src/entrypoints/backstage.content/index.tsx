import "./style.css";
import { browser } from "wxt/browser";
import { UiModule } from "./module/ui";
import { BulkModule } from "./module/bulk";
import { log } from "./utils";
import { availabilityScraper } from '../../features/operations/services/availability-scraper.service';
import { ChatAutomationService } from "../../features/operations/services/chat-automation.service";

export default defineContentScript({
  matches: ["*://live-backstage.tiktok.com/*"],
  cssInjectionMode: "ui",
  runAt: "document_end",

  async main(ctx) {
    console.log("DreamLive");

    // 1. Iniciar UI (Panel Flotante)
    UiModule.startAutoMount(ctx);

    // 2. Avisar al Background que estamos listos
    setTimeout(() => {
      try {
        if (browser.runtime?.id) {
          const isMessages = location.href.includes("/instant-messages");
          browser.runtime.sendMessage({
            type: isMessages ? "MESSAGES_PAGE_READY" : "BACKSTAGE_SCRIPT_READY",
          }).catch(() => {});
        }
      } catch (e) {
        // Silencioso si el contexto fue invalidado por recarga de la extensión
      }
    }, 2000);

    // 3. Router de Mensajes
    const messageListener = (message: any) => {
      // A. Flujo de Comprobación Masiva
      if (message.type === "CHECK_BATCH_ON_PAGE") {
        BulkModule.processBatch(message.users);
      }

      // B. Flujo de Contacto (Chat)
      else if (message.type === "PROCESS_CONTACT_FLOW") {
        const chatService = ChatAutomationService.getInstance();
        chatService.setCallbacks({
          onLog: (msg, type) => log(msg, type),
          onProgress: (current, total) => console.log(`[ChatAutomation] Progreso: ${current}/${total}`),
          onStatusChange: (isRunning) => console.log(`[ChatAutomation] Estado corriendo: ${isRunning}`),
        });
        chatService.start(
          message.leads,
          message.templates,
          message.targetSuccessCount
        );
      }
      else if (message.type === "ABORT_CONTACT_FLOW") {
        ChatAutomationService.getInstance().abort();
      }
      else if (message.type === "ABORT_CHECKING_FLOW") {
        BulkModule.abort();
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    // Clean up en recargas de HMR o desmontaje
    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(messageListener);
    });
  },
});
