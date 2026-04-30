import { browser } from 'wxt/browser';

/**
 * TikTokScraperService
 * Migración directa del motor de old_ext adaptado a la nueva arquitectura.
 * Responsabilidad: Interactuar con el DOM real de TikTok para extraer leads.
 */
class TikTokScraperService {
  private isCollecting = false;
  private scrollInterval: NodeJS.Timeout | null = null;
  private processedUsers = new Set<string>();
  private noResultsCounter = 0;
  private leadCount = 0;
  private licenseId: string | null = null;

  // Callback para notificar a la UI
  private onLogCallback: ((msg: string) => void) | null = null;
  private onCountChangeCallback: ((count: number) => void) | null = null;
  private onStatusChangeCallback: ((active: boolean) => void) | null = null;
  private onRotateKeywordCallback: (() => void) | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Escuchar cambios de keyword para reiniciar el motor si está activo
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'KEYWORD_CHANGED' && this.isCollecting) {
        this.handleKeywordChange();
      }
    });
  }

  private async handleKeywordChange() {
    this.log(`Detectado cambio de keyword. Preparando reinicio...`);

    // Detener temporalmente sin limpiar los logs totalmente
    if (this.scrollInterval) clearInterval(this.scrollInterval);

    // Dar tiempo a TikTok para que cargue el nuevo DOM
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (this.isCollecting) {
        this.log("Reiniciando extracción con nuevos resultados...");
        this.processedUsers.clear(); // Limpiar para detectar en el nuevo nicho
        this.runLoop();
      }
    }, 2500);
  }

  public setCallbacks(callbacks: {
    onLog: (msg: string) => void;
    onCountChange: (count: number) => void;
    onStatusChange: (active: boolean) => void;
    onRotate?: () => void;
  }) {
    this.onLogCallback = callbacks.onLog;
    this.onCountChangeCallback = callbacks.onCountChange;
    this.onStatusChangeCallback = callbacks.onStatusChange;
    if (callbacks.onRotate) {
      this.onRotateKeywordCallback = callbacks.onRotate;
    }
  }

  public setLicenseId(id: string) {
    this.licenseId = id;
  }

  public log(msg: string) {
    const time = new Date().toLocaleTimeString();
    if (this.onLogCallback) this.onLogCallback(`[${time}] ${msg}`);
    console.log(`[TikTokScraper] ${msg}`);
  }

  private parseViewers(text: string | null | undefined): number {
    if (!text) return 0;
    const cleanText = text.toUpperCase().trim();
    let multiplier = 1;
    if (cleanText.includes("K")) multiplier = 1000;
    if (cleanText.includes("M")) multiplier = 1000000;
    const numberPart = cleanText.replace(/[^\d.]/g, "");
    const number = parseFloat(numberPart);
    return isNaN(number) ? 0 : Math.floor(number * multiplier);
  }

  private async extraerUsuarios() {
    if (!this.isCollecting) return;

    const videoCards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-e2e="search_live-item"]')
    );

    let batchCount = 0;

    videoCards.forEach((videoCard) => {
      if (videoCard.dataset.dreamProcessed) return;

      let username = "";
      const container = videoCard.parentElement as HTMLElement;
      if (!container) return;

      const userElement = container.querySelector('[data-e2e="search-card-user-unique-id"]');

      if (userElement && userElement.textContent) {
        username = userElement.textContent.trim();
      } else {
        const userLink = container.querySelector<HTMLAnchorElement>('a[href^="/@"]');
        if (userLink?.getAttribute("href")) {
          username = userLink.getAttribute("href")!.split("/@")[1]?.split("?")[0] || "";
        }
      }

      const liveTextWraps = Array.from(videoCard.querySelectorAll(".css-1j09n5k-7937d88b--LiveTextWrap"));

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
          const parsedNumber = this.parseViewers(rawText);

          if (svgPath.startsWith("M24 3a10")) {
            viewers = parsedNumber;
            sourceType = "tiktok_live_viewers";
          } else if (svgPath.startsWith("M26.56")) {
            likes = parsedNumber;
            sourceType = "tiktok_live_likes";
          }
        }
      }

      if (username && !this.processedUsers.has(username)) {
        this.processedUsers.add(username);
        batchCount++;
        this.leadCount++;

        if (this.onCountChangeCallback) this.onCountChangeCallback(this.leadCount);

        // Enviar al background para guardar en API
        browser.runtime.sendMessage({
          type: "SAVE_LEAD",
          license_id: this.licenseId,
          username: username,
          viewers: viewers,
          likes: likes,
          source: sourceType,
        });

        // Feedback Visual en el DOM de TikTok
        videoCard.style.border = "2px solid #007AFF";
        videoCard.style.borderRadius = "12px";
        videoCard.style.position = "relative";
        videoCard.dataset.dreamProcessed = "true";

        // Añadir Badge "RECOPILADO" estilo Apple
        const badge = document.createElement("div");
        badge.innerText = "RECOPILADO";
        Object.assign(badge.style, {
          position: "absolute", top: "10px", right: "10px",
          background: "rgba(0, 122, 255, 0.9)", color: "white",
          fontSize: "9px", fontWeight: "800", padding: "4px 8px",
          borderRadius: "12px", zIndex: "10", backdropFilter: "blur(4px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        });
        videoCard.appendChild(badge);
      }
    });

    if (batchCount > 0) {
      this.log(`${batchCount} nuevos leads detectados.`);
      this.noResultsCounter = 0;
    } else {
      this.noResultsCounter++;
    }
  }

  private autoScroll() {
    if (!this.isCollecting) return;

    // Estrategia 1: Simular tecla "End"
    const endEvent = new KeyboardEvent("keydown", {
      key: "End", code: "End", keyCode: 35, which: 35, bubbles: true
    });
    document.body.dispatchEvent(endEvent);

    // Estrategia 2: Scroll Into View del último elemento
    const videoCards = document.querySelectorAll('[data-e2e="search_live-item"]');
    if (videoCards.length > 0) {
      const lastCard = videoCards[videoCards.length - 1] as HTMLElement;
      lastCard.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    this.log("Desplazando lista de espectadores...");

    // Verificar si el nicho se agotó
    if (this.noResultsCounter >= 3) {
      this.log("Nicho agotado. Rotando palabra clave...");
      if (this.onRotateKeywordCallback) {
        this.onRotateKeywordCallback();
      } else {
        browser.runtime.sendMessage({ type: "ROTATE_KEYWORD" });
      }
      this.noResultsCounter = 0;
    }
  }

  public async start() {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.leadCount = 0;
    this.processedUsers.clear();

    if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
    if (this.onCountChangeCallback) this.onCountChangeCallback(0);

    this.log("Iniciando motor de extracción...");
    this.runLoop();
  }

  private runLoop() {
    if (this.scrollInterval) clearInterval(this.scrollInterval);
    this.scrollInterval = setInterval(() => {
      if (!this.isCollecting) return;
      this.extraerUsuarios();
      setTimeout(() => this.autoScroll(), 1000);
    }, 3000);
  }

  public stop() {
    this.isCollecting = false;
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
    if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
    this.log("Motor de extracción detenido.");
  }

  public getIsRunning() {
    return this.isCollecting;
  }
}

export const tiktokScraper = new TikTokScraperService();
