import { browser } from "wxt/browser";
import { delay, DomUtils } from "./dom-automation.utils";
import { 
  SCRAPER_BATCH_SIZE, 
  SCRAPER_DELAYS, 
  SCRAPER_DEFAULT_TAGS,
  MESSAGES,
  DOM_SELECTORS,
  SCRAPER_STATUS_MARKERS,
  SCRAPER_CREATOR_TYPES
} from "../../shared/constants";

export type ScraperLogType = "info" | "success" | "error";

export interface ScraperCallbacks {
  onLog: (msg: string, type?: ScraperLogType) => void;
  onProgress: (currentTotal: number, total: number, currentBatch: number, totalBatch: number) => void;
  onStatusChange: (isRunning: boolean) => void;
}

export class AvailabilityScraperService {
  private isRunning = false;
  private abortSignal = false;
  private callbacks: ScraperCallbacks | null = null;
  private activeTags: string[] = SCRAPER_DEFAULT_TAGS;
  private currentTotalAnalyzed = 0;
  private totalExpected = 0;

  constructor() {}

  public setCallbacks(callbacks: ScraperCallbacks) {
    this.callbacks = callbacks;
  }

  public setTags(tags: string[]) {
    this.activeTags = tags;
  }

  private log(msg: string, type: ScraperLogType = "info") {
    if (this.callbacks) {
      this.callbacks.onLog(msg, type);
    }
  }

  private updateProgress(currentTotal: number, total: number, currentBatch: number, totalBatch: number) {
    if (this.callbacks) {
      this.callbacks.onProgress(currentTotal, total, currentBatch, totalBatch);
    }
  }

  public async start() {
    if (this.isRunning) return;
    
    // Validar ruta
    const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (!normalize(window.location.href).includes("live-backstage.tiktok.com/portal/anchor/relation")) {
      this.log("❌ Ruta incorrecta. Navega a Relation Management.", "error");
      return;
    }

    this.isRunning = true;
    this.abortSignal = false;
    this.currentTotalAnalyzed = 0;
    this.totalExpected = 0;
    if (this.callbacks) this.callbacks.onStatusChange(true);

    try {
      await this.mainLoop();
    } catch (error: any) {
      this.log(`💥 Error crítico: ${error.message}`, "error");
    } finally {
      this.stop();
    }
  }

  public stop() {
    this.isRunning = false;
    this.abortSignal = true;
    if (this.callbacks) this.callbacks.onStatusChange(false);
    this.log("🛑 Motor detenido.", "info");
  }

  private async mainLoop() {
    while (this.isRunning && !this.abortSignal) {
      this.log(`🔍 Solicitando lote de leads recopilados...`);
      
      // 1. Pedir lote al background (Modelo PULL)
      const response = await browser.runtime.sendMessage({ 
        type: MESSAGES.GET_BATCH_TO_CHECK,
        batchSize: SCRAPER_BATCH_SIZE
      });

      if (!response || !response.users || response.users.length === 0) {
        this.log("🏁 No hay más leads para procesar.", "success");
        break;
      }

      const users = response.users as string[];
      
      // Capturar el total esperado. Lo actualizamos si el totalInDb es mayor al actual 
      // para evitar inconsistencias visuales (como 108 / 85)
      const totalInDb = response.totalInDb || 0;
      if (this.totalExpected === 0 || totalInDb > this.totalExpected) {
        this.totalExpected = totalInDb;
      }

      this.log(`🚀 Procesando lote de ${users.length} usuarios...`, "info");
      this.updateProgress(this.currentTotalAnalyzed, this.totalExpected, 0, users.length);

      // 2. Procesar en TikTok UI
      const disponibles = await this.processBatchOnPage(users);

      if (this.abortSignal) break;

      // Actualizar progreso total con el número de usuarios procesados
      this.currentTotalAnalyzed += users.length;
      this.updateProgress(this.currentTotalAnalyzed, this.totalExpected, users.length, users.length);

      // 3. Enviar resultados
      this.log(`✅ Lote procesado. ${disponibles.length} disponibles encontrados que cumplen tus filtros.`, "success");
      const updateRes = await browser.runtime.sendMessage({
        type: MESSAGES.BATCH_PROCESSED,
        disponibles,
        procesados: users
      });

      // El totalInDb puede haber cambiado tras el procesamiento (leads ya no son 'recopilado')
      // pero el background nos lo dirá en la siguiente llamada a GET_BATCH_TO_CHECK
      
      if (response.totalRemaining === 0 && (!response.totalInDb || response.totalInDb <= users.length)) {
        this.log("🏁 Todos los leads procesados con éxito.", "success");
        break;
      }

      // Respiro entre lotes
      this.log(`⏳ Esperando ${SCRAPER_DELAYS.BETWEEN_BATCHES / 1000} segundos antes del siguiente lote...`, "info");
      await delay(SCRAPER_DELAYS.BETWEEN_BATCHES); 
    }
  }

  private async processBatchOnPage(users: string[]): Promise<string[]> {
    // A. Reset e interfaz garantizada
    const ready = await this.resetInterface();
    if (!ready || this.abortSignal) return [];

    // B. Encontrar textarea
    const textarea = document.querySelector(DOM_SELECTORS.TEXTAREA_SEARCH) as HTMLTextAreaElement;
    if (!textarea) {
      this.log("❌ Campo de búsqueda no disponible.", "error");
      return [];
    }

    // C. Pegar usuarios (Respetar DomUtils)
    this.log(`📝 Pegando ${users.length} usuarios en el textarea...`);
    DomUtils.focusReal(textarea);
    DomUtils.setNativeValue(textarea, users.join("\n"));
    await delay(SCRAPER_DELAYS.AFTER_PASTE);

    // D. Clic Siguiente
    const buttons = Array.from(document.querySelectorAll("button"));
    const nextBtn = buttons.find((b) => {
      const txt = b.innerText.toLowerCase();
      return (txt.includes("next") || txt.includes("siguiente") || txt.includes("continuar")) && !b.disabled;
    });

    if (nextBtn) {
      this.log("🖱️ Buscando disponibilidad...");
      nextBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      nextBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      (nextBtn as HTMLElement).click();
    } else {
      this.log("❌ Botón 'Siguiente' no disponible.", "error");
      return [];
    }

    // E. Esperar resultados de la tabla
    this.log("⏳ Analizando estados...");
    await delay(SCRAPER_DELAYS.TABLE_LOAD);
    try {
      await DomUtils.waitWithCheck(DOM_SELECTORS.TABLE_ROW, SCRAPER_DELAYS.TABLE_WAIT_CHECK, () => this.abortSignal);
    } catch (e) {
      this.log("⚠️ Tiempo de espera agotado o tabla vacía.", "info");
    }

    if (this.abortSignal) return [];

    // F. Leer resultados
    return this.leerResultadosMasivos(users);
  }

  private async resetInterface(): Promise<boolean> {
    // 1. Intentar retroceder usando el selector exacto indicado
    const backBtn = document.querySelector(DOM_SELECTORS.BACK_BUTTON);
    if (backBtn) {
      this.log("🔙 Volviendo a la búsqueda principal...");
      // Forzar mousedown, mouseup, y click para que sea completamente robusto
      backBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      backBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      (backBtn as HTMLElement).click();
      
      // Esperar hasta que el textarea de búsqueda vuelva a estar visible y habilitado
      let attempts = 0;
      while (attempts < 10) {
        if (this.abortSignal) return false;
        const tx = document.querySelector(DOM_SELECTORS.TEXTAREA_SEARCH) as HTMLTextAreaElement;
        if (tx && !tx.disabled) {
          break;
        }
        await delay(500);
        attempts++;
      }
    }

    // 2. Intentar abrir modal si no está abierto (por si acaso o primer lote)
    let textarea = document.querySelector(DOM_SELECTORS.TEXTAREA_SEARCH) as HTMLTextAreaElement;
    if (!textarea) {
      // Filtrar para no presionar jamás getInvitationCodeBtn
      const btnInvite = Array.from(document.querySelectorAll(DOM_SELECTORS.INVITE_BUTTON))
        .find(btn => 
          !btn.getAttribute('data-id')?.includes('getInvitationCode') && 
          !btn.getAttribute('data-e2e-tag')?.includes('getInvitationCode')
        ) as HTMLElement;

      if (btnInvite) {
        this.log("🖱️ Abriendo modal de invitación...");
        btnInvite.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        btnInvite.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        (btnInvite as HTMLElement).click();
        
        // Esperar hasta 3 segundos (6 intentos de 500ms) para que aparezca el textarea
        let attempts = 0;
        while (attempts < 6) {
          if (this.abortSignal) return false;
          textarea = document.querySelector(DOM_SELECTORS.TEXTAREA_SEARCH) as HTMLTextAreaElement;
          if (textarea && !textarea.disabled) {
            break;
          }
          await delay(500);
          attempts++;
        }
      }
    }

    // Si tras intentar abrirlo/volver el textarea no existe, el método retorna false.
    if (!textarea || textarea.disabled) {
      this.log("❌ Error: No se pudo abrir o cargar el textarea de búsqueda.", "error");
      return false;
    }

    // 3. Limpieza garantizada ANTES de retornar que está listo
    DomUtils.focusReal(textarea);
    DomUtils.setNativeValue(textarea, "");
    await delay(300);

    return true;
  }

  private async leerResultadosMasivos(usersOriginales: string[]): Promise<string[]> {
    const disponibles: string[] = [];
    let processedCount = 0;
    const rows = Array.from(document.querySelectorAll(DOM_SELECTORS.ROWS));
    
    for (const row of rows) {
      if (this.abortSignal) break;

      const userCell = row.querySelector(DOM_SELECTORS.USER_CELL);
      const userText = (userCell?.textContent || "").toLowerCase();
      const usernameFound = usersOriginales.find((u) => userText.includes(u.toLowerCase()));

      if (!usernameFound) continue;

      const statusCell = row.querySelector(DOM_SELECTORS.STATUS_CELL);
      const statusHtml = statusCell?.innerHTML || "";
      const isOnline = statusHtml.includes(SCRAPER_STATUS_MARKERS.ONLINE);
      const isForbidden = statusHtml.includes(SCRAPER_STATUS_MARKERS.FORBIDDEN);

      if (isForbidden) {
        this.log(`⛔ @${usernameFound} -> NO APTO`, "error");
        continue;
      }

      // Detección de Tipo (Elite, Popular, Premium)
      const typeCell = row.querySelector(DOM_SELECTORS.TYPE_CELL);
      let creatorType = SCRAPER_CREATOR_TYPES.NORMAL.name;

      if (typeCell) {
        const html = typeCell.innerHTML;
        if (html.includes(SCRAPER_CREATOR_TYPES.ELITE.color)) creatorType = SCRAPER_CREATOR_TYPES.ELITE.name;
        else if (html.includes(SCRAPER_CREATOR_TYPES.POPULAR.color)) creatorType = SCRAPER_CREATOR_TYPES.POPULAR.name;
        else if (html.includes(SCRAPER_CREATOR_TYPES.PREMIUM.color)) creatorType = SCRAPER_CREATOR_TYPES.PREMIUM.name;
      }

      if (isOnline) {
        if (this.activeTags.includes(creatorType)) {
          disponibles.push(usernameFound);
          this.log(`🟢 @${usernameFound} detectado ONLINE [${creatorType}]`, "success");
        } else {
          this.log(`⏭️ @${usernameFound} descartado por tipo: ${creatorType}`);
        }
      } else {
        this.log(`🌑 @${usernameFound} está offline.`);
      }
      
      processedCount++;
      this.updateProgress(this.currentTotalAnalyzed + processedCount, this.totalExpected, processedCount, usersOriginales.length);
    }

    return disponibles;
  }
}

export const availabilityScraper = new AvailabilityScraperService();
