import { browser } from "wxt/browser";
import { UiModule } from "./module/ui";
import { BulkModule } from "./module/bulk";
import { ChatModule } from "./module/chat";
import { log } from "./utils";

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
      const isMessages = location.href.includes("/instant-messages");
      browser.runtime.sendMessage({
        type: isMessages ? "MESSAGES_PAGE_READY" : "BACKSTAGE_SCRIPT_READY",
      });
    }, 2000);

    // 3. Router de Mensajes
    const messageListener = (message: any) => {
      // A. Flujo de Comprobación Masiva
      if (message.type === "CHECK_BATCH_ON_PAGE") {
        BulkModule.processBatch(message.users);
      }

      // B. Flujo de Contacto (Chat)
      else if (message.type === "PROCESS_CONTACT_FLOW") {
        ChatModule.processFlow(
          message.leads,
          message.templates,
          message.targetSuccessCount,
        );
      }
      if (message.type === "ABORT_CONTACT_FLOW") {
        ChatModule.abort();
      }
      if (message.type === "ABORT_CHECKING_FLOW") {
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
