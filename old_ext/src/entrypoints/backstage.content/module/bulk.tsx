import { delay, log, DomUtils } from "../utils";
import { browser } from "wxt/browser";
import { supabase } from "@/utils/supabase";

let abortSignal = false;

// 🚨 TRAMPA DE DEBUGGING
window.addEventListener("beforeunload", () => {
  console.log(
    "%c🔥 ¡LA PÁGINA SE ESTÁ RECARGANDO! 🔥",
    "background: red; color: white; font-size: 20px; padding: 10px;",
  );
});

export const BulkModule = {
  abort() {
    log("🛑 Deteniendo comprobación...", "info");
    abortSignal = true;
  },

  // 🛡️ HELPER: Bloquea que un botón cause refresh
  neuterButton(btn: HTMLElement) {
    if (btn.getAttribute("type") === "submit") {
      btn.setAttribute("type", "button");
    }
    const parentForm = btn.closest("form");
    if (parentForm) {
      // log("🛡️ Formulario padre detectado. Bloqueando submit...", "info");
      parentForm.onsubmit = (e) => {
        e.preventDefault();
        return false;
      };
    }
  },

  // ✅ HELPER: Espera con reintentos exponenciales
  async waitForElementWithRetry(
    selector: string,
    maxAttempts = 5,
    baseDelay = 500,
  ): Promise<Element | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (abortSignal) {
        log("🛑 Búsqueda cancelada por abort signal", "info");
        return null;
      }

      const element = document.querySelector(selector);
      if (element) {
        log(`✅ Elemento encontrado: (intento ${attempt})`, "success");
        return element;
      }

      const delay = baseDelay * Math.pow(1.5, attempt - 1); // Exponential backoff
      log(
        `⏳ Elemento no encontrado. Reintentando en ${delay}ms (${attempt}/${maxAttempts})...`,
        "info",
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    log(
      `❌ Elemento no encontrado después de ${maxAttempts} intentos: `,
      "error",
    );
    return null;
  },

  // ✅ 1. Reseteo de Interfaz
  async resetInterface() {
    const backBtn = document.querySelector(
      'button[data-id="invite-host-back"]',
    );

    if (backBtn) {
      log("🔙 Botón 'Back' detectado. Reseteando...", "info");
      this.neuterButton(backBtn as HTMLElement);
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      backBtn.dispatchEvent(clickEvent);
      await delay(1000);
    }

    const isOpen = await this.abrirModalInvitacion();
    return isOpen;
  },

  // ✅ 2. Abrir Modal con reintentos
  async abrirModalInvitacion() {
    // Check if already open
    const existingTextarea = await this.waitForElementWithRetry(
      'textarea[data-testid="inviteHostTextArea"]',
      2,
      300,
    );
    if (existingTextarea) {
      log("✅ Modal ya está abierto", "success");
      return true;
    }

    const btnInvite = document.querySelector(
      'button[data-e2e-tag="host_manageRelationship_addHostBtn"], button[data-id="add-host"]',
    );

    if (btnInvite) {
      log("🖱️ Abriendo modal...", "info");
      this.neuterButton(btnInvite as HTMLElement);
      (btnInvite as HTMLElement).click();

      // Wait with retry logic
      const textarea = await this.waitForElementWithRetry(
        'textarea[data-testid="inviteHostTextArea"]',
        5,
        600,
      );

      if (textarea) {
        log("✅ Modal abierto exitosamente", "success");
        return true;
      } else {
        log("❌ El modal no se abrió después de múltiples intentos", "error");
        return false;
      }
    }
    log("❌ No encontré el botón para abrir el modal.", "error");
    return false;
  },

  async leerResultadosMasivos(
    usersOriginales: string[],
    allowedTypes: string[] = [],
  ) {
    log("📊 Analizando tabla...", "info");
    const disponibles: string[] = [];
    const tiposPermitidos =
      allowedTypes.length > 0 ? allowedTypes : ["Normal", "Elite", "Popular", "Premium"];

    log(`🎯 Filtro activo: ${tiposPermitidos.join(", ")}`);

    const rows = Array.from(
      document.querySelectorAll('tr[role="row"], tr.semi-table-row'),
    );

    if (rows.length === 0) {
      log("⚠️ Tabla vacía.", "info");
      return [];
    }

    for (const row of rows) {
      // A. USUARIO
      const userCell = row.querySelector(
        'td[aria-colindex="1"], td:first-child',
      );
      const userText = userCell
        ? (userCell.textContent || "").toLowerCase()
        : "";
      const usernameFound = usersOriginales.find((u) =>
        userText.includes(u.toLowerCase()),
      );

      if (!usernameFound) continue;

      // B. ESTADO
      const statusCell = row.querySelector(
        'td[aria-colindex="2"], td:nth-child(2)',
      );
      const statusHtml = statusCell ? statusCell.innerHTML : "";
      const esVerde = statusHtml.includes("semi-tag-green-light");
      const esRojo = statusHtml.includes("semi-tag-red-light");

      if (esRojo) {
        log(`⛔ @${usernameFound} -> NO APTO`, "error");
        continue;
      }

      // C. TIPO (Detección por Color SVG + Texto)
      const typeCell = row.querySelector(
        'td[aria-colindex="3"], td:nth-child(3)',
      );
      let tipoCreador = "Normal";

      if (typeCell) {
        const htmlContent = typeCell.innerHTML;
        const textContent = (typeCell.textContent || "").toLowerCase().trim();

        // 1. Prioridad: Color del SVG
        if (htmlContent.includes("#FF9506")) {
          tipoCreador = "Elite"; // Naranja
        } else if (htmlContent.includes("#836BFE")) {
          tipoCreador = "Popular"; // Morado (High-follower)
        } else if (htmlContent.includes("#2CB8C5")) {
          tipoCreador = "Premium"; // Celeste (Premium)
        }
        // 2. Fallback: Texto
        else {
          if (textContent.includes("elite")) tipoCreador = "Elite";
          else if (
            textContent.includes("popular") ||
            textContent.includes("top") ||
            textContent.includes("high-follower")
          ) {
            tipoCreador = "Popular";
          } else if (textContent.includes("premium")) {
            tipoCreador = "Premium";
          }
        }
      }

      // D. FILTRO
      if (esVerde) {
        if (tiposPermitidos.includes(tipoCreador)) {
          if (!disponibles.includes(usernameFound)) {
            disponibles.push(usernameFound);

            let icono = "🟢";
            if (tipoCreador === "Elite") icono = "🔶";
            if (tipoCreador === "Popular") icono = "🔥";
            if (tipoCreador === "Premium") icono = "💎";

            log(
              `${icono} @${usernameFound} -> DISPONIBLE [${tipoCreador}]`,
              "success",
            );
          }
        } else {
          log(
            `⏭️ @${usernameFound} -> Descartado por filtro (${tipoCreador})`,
            "info",
          );
        }
      }
    }
    return disponibles;
  },

  // ✅ 4. HELPER CONFIG
  async getInvitationConfig() {
    try {
      const storage = await browser.storage.local.get("savedLicense");
      const licenseId = (storage.savedLicense as any)?.key;
      if (!licenseId) return ["Normal", "Elite", "Popular", "Premium"];

      const { data } = await (supabase.from("licenses") as any)
        .select("invitation_types")
        .eq("license_key", licenseId)
        .single();

      if (data && data.invitation_types) {
        return data.invitation_types;
      }
    } catch (e) {
      // Silencioso
    }
    return ["Normal", "Elite", "Popular", "Premium"];
  },

  // ✅ 5. PROCESO PRINCIPAL
  async processBatch(users: string[]) {
    abortSignal = false;
    log(`🚀 Procesando lote: ${users.length} usuarios`);

    if (abortSignal) return;

    // A. CONFIG
    const allowedTypes = await this.getInvitationConfig();

    // B. RESET
    const ready = await this.resetInterface();
    if (!ready) {
      log("❌ Interfaz no lista.", "error");
      return;
    }

    // Check abort after reset
    if (abortSignal) {
      log("🛑 Proceso detenido después de reset", "info");
      return;
    }

    // C. FIND TEXTAREA with retry
    const textarea = (await this.waitForElementWithRetry(
      'textarea[data-testid="inviteHostTextArea"]',
      5,
      500,
    )) as HTMLTextAreaElement;

    if (!textarea) {
      log("❌ Textarea no encontrado después de múltiples intentos.", "error");
      return;
    }

    // D. PEGAR
    log(`📝 Pegando ${users.length} usuarios en textarea...`, "info");
    DomUtils.focusReal(textarea);
    DomUtils.setNativeValue(textarea, "");
    await delay(100);

    // Check abort before pasting
    if (abortSignal) {
      log("🛑 Proceso detenido antes de pegar usuarios", "info");
      return;
    }

    DomUtils.setNativeValue(textarea, users.join("\n"));
    await delay(800);
    log(`✅ ${users.length} usuarios cargados en el campo de texto`, "success");

    // E. CLIC SIGUIENTE (BLINDADO) with retry
    log("🔍 Buscando botón 'Siguiente'...", "info");
    let nextBtn: HTMLElement | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const buttons = Array.from(document.querySelectorAll("button"));
      nextBtn = buttons.find((b) => {
        const txt = b.innerText.toLowerCase();
        return (
          (txt.includes("next") ||
            txt.includes("siguiente") ||
            txt.includes("continuar")) &&
          !b.disabled
        );
      }) as HTMLElement | null;

      if (nextBtn) {
        log(`✅ Botón encontrado (intento ${attempt})`, "success");
        break;
      }

      if (attempt < 3) {
        log(`⏳ Botón no encontrado, reintentando... (${attempt}/3)`, "info");
        await delay(500);
      }
    }

    if (nextBtn) {
      log("🖱️ Clic en Siguiente...");
      // Check abort before clicking next
      if (abortSignal) {
        log("🛑 Proceso detenido antes de hacer clic en Siguiente", "info");
        return;
      }

      log("�️ Clic en Siguiente...", "info");
      nextBtn.click();
    } else {
      log(
        "❌ Botón Siguiente no disponible después de múltiples intentos.",
        "error",
      );
      return;
    }

    // F. ESPERAR RESULTADOS
    log("⏳ Esperando resultados...", "info");
    await delay(3000);

    // Check abort after waiting for results
    if (abortSignal) {
      log("🛑 Proceso detenido después de esperar resultados", "info");
      return;
    }
    try {
      await DomUtils.waitWithCheck(".semi-table-row", 8000, () => abortSignal);
      if (abortSignal) return;
      await delay(1500);
    } catch (e: any) {
      if (e.message === "ABORTED_BY_signal") return;
      log("⚠️ Timeout (¿Tabla vacía?).", "info");
    }

    if (abortSignal) return;

    // G. LEER
    const disponibles = await this.leerResultadosMasivos(users, allowedTypes);
    log(`🏁 Lote finalizado. ${disponibles.length} aptos.`);

    browser.runtime.sendMessage({
      type: "BATCH_PROCESSED",
      disponibles,
      procesados: users,
    });
  },
};
