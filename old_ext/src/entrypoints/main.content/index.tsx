import "./style.css";
import ReactDOM from "react-dom/client";
import { ActionPanel } from "@/components/tiktok/ActionPanel";
import { browser } from "wxt/browser";

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO
// ==========================================

let isCollecting = false;
let scrollInterval: NodeJS.Timeout | null = null;
let processedUsers = new Set<string>();
let noResultsCounter = 0;

const parseViewers = (text: string | null | undefined): number => {
  if (!text) return 0;
  const cleanText = text.toUpperCase().trim();
  let multiplier = 1;
  if (cleanText.includes("K")) multiplier = 1000;
  if (cleanText.includes("M")) multiplier = 1000000;
  const numberPart = cleanText.replace(/[^\d.]/g, "");
  const number = parseFloat(numberPart);
  return isNaN(number) ? 0 : Math.floor(number * multiplier);
};

// ==========================================
// 2. MOTOR DE EXTRACCIÓN (INTELIGENTE - NUEVO)
// ==========================================

const extraerUsuarios = () => {
  if (!isCollecting) return;

  const videoCards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-e2e="search_live-item"]'),
  );

  videoCards.forEach((videoCard) => {
    if (videoCard.dataset.dreamProcessed) return;

    let username = "";

    // --- A. DATA MINING (USUARIO) ---
    const container = videoCard.parentElement as HTMLElement;
    if (!container) return;

    const userElement = container.querySelector(
      '[data-e2e="search-card-user-unique-id"]',
    );

    if (userElement && userElement.textContent) {
      username = userElement.textContent.trim();
    } else {
      const userLink =
        container.querySelector<HTMLAnchorElement>('a[href^="/@"]');
      if (userLink?.getAttribute("href")) {
        username =
          userLink.getAttribute("href")!.split("/@")[1]?.split("?")[0] || "";
      }
    }

    // --- B. DETECCIÓN DE MÉTRICAS (Viewers vs Likes) ---
    // Usamos la lógica nueva de SVG para diferenciar
    const liveTextWraps = Array.from(
      videoCard.querySelectorAll(".css-1j09n5k-7937d88b--LiveTextWrap"),
    );

    let viewers = 0;
    let likes = 0;
    let sourceType = "unknown";
    let rawText = "0";

    if (liveTextWraps.length > 0) {
      const wrapper = liveTextWraps[0];
      const svgPath = wrapper.querySelector("path")?.getAttribute("d");
      const textDiv = wrapper.querySelector(".css-1tjg35o-7937d88b--LiveText");

      if (svgPath && textDiv && textDiv.textContent) {
        rawText = textDiv.textContent;
        const parsedNumber = parseViewers(rawText);

        if (svgPath.startsWith("M24 3a10")) {
          // VIEWERS (Ojito)
          viewers = parsedNumber;
          sourceType = "tiktok_live_viewers";
        } else if (svgPath.startsWith("M26.56")) {
          // LIKES (Corazón)
          likes = parsedNumber;
          sourceType = "tiktok_live_likes";
        } else {
          // Fallback por regex si el SVG cambia
          if (/^\d+(\.\d+)?[KM]?$/.test(rawText)) {
            viewers = parsedNumber;
            sourceType = "tiktok_live_fallback";
          }
        }
      }
    } else {
      // FALLBACK LEGACY (Código antiguo por si acaso)
      const textNodes = Array.from(videoCard.querySelectorAll("div"));
      for (const node of textNodes) {
        const txt = node.textContent?.trim();
        if (txt && txt !== "LIVE" && /^\d+(\.\d+)?[KM]?$/.test(txt)) {
          viewers = parseViewers(txt);
          rawText = txt;
          sourceType = "tiktok_live_legacy";
          break;
        }
      }
    }

    // --- C. GUARDADO ---
    if (username && !processedUsers.has(username)) {
      console.log(`✅ CAPTURADO: @${username} (${sourceType}: ${rawText})`);
      processedUsers.add(username);

      // 1. Enviar a BD (Con soporte para Likes)
      browser.runtime.sendMessage({
        type: "SAVE_LEAD",
        username: username,
        viewers: viewers, // Va a columna viewer_count
        likes: likes, // Va a columna likes_count
        source: sourceType,
      });

      // 2. AVISAR AL PANEL
      document.dispatchEvent(
        new CustomEvent("dreamlive-new-lead", {
          detail: { username: username, viewers: viewers, likes: likes },
          bubbles: true,
          composed: true,
        }),
      );

      // 3. Feedback Visual
      videoCard.style.border = "3px solid #00ff00";
      videoCard.style.boxSizing = "border-box";
      videoCard.style.position = "relative";
      videoCard.dataset.dreamProcessed = "true";
    }
  });
};

// ==========================================
// 3. DETECTOR DE FIN DE RESULTADOS
// ==========================================

const checkEndOfResults = () => {
  const bodyText = document.body.innerText;
  const endPhrases = [
    "No hay más resultados",
    "No more results",
    "End of results",
  ];

  const hasEnded = endPhrases.some((phrase) => bodyText.includes(phrase));

  if (hasEnded) {
    noResultsCounter++;
    console.log(`⚠️ Fin detectado (${noResultsCounter}/3)`);

    if (noResultsCounter >= 3) {
      console.log("🔄 SOLICITANDO ROTACIÓN...");
      noResultsCounter = 0;

      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      browser.runtime.sendMessage({ type: "ROTATE_KEYWORD" });
    }
  } else {
    noResultsCounter = 0;
  }
};

// ==========================================
// 4. CONTROL Y SCROLL (SIMULACIÓN DE TECLADO)
// ==========================================

// Nueva estrategia: Simular interacción del usuario con eventos de teclado
// Esto es más confiable para páginas con scroll virtual como TikTok
const autoScroll = () => {
  if (!isCollecting) return;

  // Estrategia 1: Simular tecla "End" para ir al final de la página
  const endEvent = new KeyboardEvent("keydown", {
    key: "End",
    code: "End",
    keyCode: 35,
    which: 35,
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(endEvent);

  // Estrategia 2: Simular múltiples "PageDown"
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      const pageDownEvent = new KeyboardEvent("keydown", {
        key: "PageDown",
        code: "PageDown",
        keyCode: 34,
        which: 34,
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(pageDownEvent);
    }
  }, 100);

  // Estrategia 3: Buscar el último elemento visible y hacer focus + scrollIntoView
  setTimeout(() => {
    const videoCards = document.querySelectorAll(
      '[data-e2e="search_live-item"]',
    );
    if (videoCards.length > 0) {
      const lastCard = videoCards[videoCards.length - 1] as HTMLElement;

      // Hacer que el elemento sea focusable temporalmente
      if (!lastCard.hasAttribute("tabindex")) {
        lastCard.setAttribute("tabindex", "-1");
      }

      // Focus y scroll hacia el elemento
      lastCard.focus();
      lastCard.scrollIntoView({ behavior: "smooth", block: "end" });

      console.log(
        `📜 Scroll hacia elemento ${videoCards.length} (último visible)`,
      );
    }
  }, 200);

  // Estrategia 4: Forzar scroll en todos los elementos scrollables encontrados
  setTimeout(() => {
    const scrollableElements = document.querySelectorAll<HTMLElement>(
      'div[style*="overflow"], div[class*="scroll"]',
    );

    scrollableElements.forEach((el) => {
      if (el.scrollHeight > el.clientHeight) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        el.scrollTop = maxScroll;
      }
    });

    // También intentar window como último recurso
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, 300);

  console.log(
    `📜 Ejecutando scroll multi-estrategia (teclado + focus + force)`,
  );

  setTimeout(checkEndOfResults, 1500);
};

// Función interna para detener limpiamente
const stopInternal = () => {
  isCollecting = false;
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
  document.dispatchEvent(
    new CustomEvent("dreamlive-status-change", {
      detail: { active: false },
      bubbles: true,
      composed: true,
    }),
  );
};

// ==========================================
// 5. MONITOR DE URL (NUEVO)
// ==========================================

let lastUrl = ""; // ✅ Inicializar vacío, se asignará en runtime
let urlCheckInterval: NodeJS.Timeout | null = null;

// URLs válidas para recopilación
const isValidCollectionUrl = (url: string): boolean => {
  // Debe estar en TikTok
  if (!url.includes("tiktok.com")) return false;

  // Debe ser una página de búsqueda de lives o similar
  const validPatterns = ["/search/live", "/search?q=", "/live/"];

  return validPatterns.some((pattern) => url.includes(pattern));
};

// Monitorear cambios de URL
const startUrlMonitoring = () => {
  if (urlCheckInterval) return;

  lastUrl = location.href;
  console.log("🔍 Iniciando monitoreo de URL...");

  urlCheckInterval = setInterval(() => {
    const currentUrl = location.href;

    if (currentUrl !== lastUrl) {
      console.log(`🔄 Cambio de URL detectado: ${lastUrl} → ${currentUrl}`);
      lastUrl = currentUrl;

      // Si estamos recopilando y la nueva URL no es válida, detener
      if (isCollecting && !isValidCollectionUrl(currentUrl)) {
        console.warn(
          "⚠️ URL no válida para recopilación. Deteniendo proceso...",
        );
        toggleRecopilacion(false);

        // Notificar al usuario
        document.dispatchEvent(
          new CustomEvent("dreamlive-notification", {
            detail: {
              type: "warning",
              message:
                "Recopilación detenida: navegaste fuera de la página de búsqueda",
            },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }
  }, 1000); // Verificar cada segundo
};

const stopUrlMonitoring = () => {
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
    urlCheckInterval = null;
    console.log("🔍 Monitoreo de URL detenido");
  }
};

// Función principal (Tiempos originales)
const toggleRecopilacion = async (activar: boolean) => {
  isCollecting = activar;

  await browser.storage.local.set({ isCollecting: activar });

  document.dispatchEvent(
    new CustomEvent("dreamlive-status-change", {
      detail: { active: activar },
      bubbles: true,
      composed: true,
    }),
  );

  if (activar) {
    // ✅ Validar que estamos en una URL correcta antes de iniciar
    if (!isValidCollectionUrl(location.href)) {
      console.error("❌ No puedes iniciar la recopilación en esta página");
      document.dispatchEvent(
        new CustomEvent("dreamlive-notification", {
          detail: {
            type: "error",
            message:
              "Debes estar en una página de búsqueda de TikTok Live para recopilar",
          },
          bubbles: true,
          composed: true,
        }),
      );
      isCollecting = false;
      await browser.storage.local.set({ isCollecting: false });
      return;
    }

    console.log("🚀 COSECHADORA INICIADA");
    noResultsCounter = 0;
    if (scrollInterval) clearInterval(scrollInterval);

    // ✅ Iniciar monitoreo de URL
    startUrlMonitoring();

    scrollInterval = setInterval(() => {
      if (!isCollecting) return;
      extraerUsuarios();
      setTimeout(autoScroll, 500); // 500ms delay como antes
    }, 2000); // Ciclo de 2s como antes
  } else {
    console.log("⏸️ DETENIDO POR USUARIO");
    stopInternal();
    stopUrlMonitoring(); // ✅ Detener monitoreo de URL
    // Notify stats to update immediately
    browser.runtime.sendMessage({ type: "COLLECTION_STOPPED" }).catch(() => { });
  }
};

export default defineContentScript({
  matches: ["*://*.tiktok.com/*"],
  cssInjectionMode: "ui",
  runAt: "document_end",

  async main(ctx) {
    // 1. ESCUCHAMOS ÓRDENES DEL POPUP
    const messageListener = (message: any) => {
      if (message.type === "toggleRecopilacion") {
        toggleRecopilacion(message.status);
        return Promise.resolve({ received: true });
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(messageListener);
    });

    console.log("🔥 DreamLive: Inyectado.");

    // 2. RECUPERACIÓN AUTOMÁTICA DE SESIÓN
    const storage = await browser.storage.local.get("isCollecting");
    if (storage.isCollecting === true) {
      console.log("🔄 Restaurando sesión de recopilación tras recarga...");
      setTimeout(() => toggleRecopilacion(true), 2000);
    }

    // 3. UI
    const ui = await createShadowRootUi(ctx, {
      name: "dreamlive-manager",
      position: "inline",
      anchor: "body",
      append: "first",
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<ActionPanel />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
  },
});
