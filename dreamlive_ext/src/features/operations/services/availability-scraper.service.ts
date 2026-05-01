import { browser } from "wxt/browser";
import { delay, DomUtils } from "./dom-automation.utils";

export type ScraperLogType = "info" | "success" | "error";

export interface ScraperCallbacks {
  onLog: (msg: string, type?: ScraperLogType) => void;
  onProgress: (current: number, total: number) => void;
  onStatusChange: (isRunning: boolean) => void;
}

export class AvailabilityScraperService {
  private isRunning = false;
  private abortSignal = false;
  private callbacks: ScraperCallbacks | null = null;
  private activeTags: string[] = ["Normal", "Elite", "Popular", "Premium"];

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

  private updateProgress(current: number, total: number) {
    if (this.callbacks) {
      this.callbacks.onProgress(current, total);
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
      // Ahora pedimos genérico 'recopilado' ya que los tags se detectan en vivo
      const response = await browser.runtime.sendMessage({ 
        type: "GET_BATCH_TO_CHECK"
      });

      if (!response || !response.users || response.users.length === 0) {
        this.log("🏁 No hay más leads para procesar.", "success");
        break;
      }

      const users = response.users as string[];
      this.log(`🚀 Procesando lote de ${users.length} usuarios...`, "info");
      this.updateProgress(0, users.length);

      // 2. Procesar en TikTok UI
      const disponibles = await this.processBatchOnPage(users);

      if (this.abortSignal) break;

      // 3. Enviar resultados
      this.log(`✅ Lote procesado. ${disponibles.length} disponibles encontrados que cumplen tus filtros.`, "success");
      await browser.runtime.sendMessage({
        type: "BATCH_PROCESSED",
        disponibles,
        procesados: users
      });

      await delay(2000); // Respiro entre lotes
    }
  }

  private async processBatchOnPage(users: string[]): Promise<string[]> {
    // A. Reset Interfaz
    const ready = await this.resetInterface();
    if (!ready || this.abortSignal) return [];

    // B. Encontrar textarea
    const textarea = (await DomUtils.waitFor(
      'textarea[data-testid="inviteHostTextArea"]',
      8000
    )) as HTMLTextAreaElement;

    if (!textarea) {
      this.log("❌ Campo de búsqueda no encontrado.", "error");
      return [];
    }

    // C. Pegar usuarios
    this.log(`📝 Tipeando ${users.length} usuarios...`);
    DomUtils.focusReal(textarea);
    DomUtils.setNativeValue(textarea, users.join("\n"));
    await delay(1000);

    // D. Clic Siguiente
    const buttons = Array.from(document.querySelectorAll("button"));
    const nextBtn = buttons.find((b) => {
      const txt = b.innerText.toLowerCase();
      return (txt.includes("next") || txt.includes("siguiente") || txt.includes("continuar")) && !b.disabled;
    });

    if (nextBtn) {
      this.log("🖱️ Buscando disponibilidad...");
      (nextBtn as HTMLElement).click();
    } else {
      this.log("❌ Botón 'Siguiente' no disponible.", "error");
      return [];
    }

    // E. Esperar resultados de la tabla
    this.log("⏳ Analizando estados...");
    await delay(3500);
    try {
      await DomUtils.waitWithCheck(".semi-table-row", 10000, () => this.abortSignal);
    } catch (e) {
      this.log("⚠️ Tiempo de espera agotado o tabla vacía.", "info");
    }

    if (this.abortSignal) return [];

    // F. Leer resultados
    return this.leerResultadosMasivos(users);
  }

  private async resetInterface(): Promise<boolean> {
    const backBtn = document.querySelector('button[data-id="invite-host-back"]');
    if (backBtn) {
      this.log("🔙 Volviendo a la búsqueda principal...");
      (backBtn as HTMLElement).click();
      await delay(1500);
    }

    // Intentar abrir modal si no está abierto
    const textarea = document.querySelector('textarea[data-testid="inviteHostTextArea"]');
    if (textarea) return true;

    const btnInvite = document.querySelector(
      'button[data-e2e-tag="host_manageRelationship_addHostBtn"], button[data-id="add-host"]'
    );

    if (btnInvite) {
      this.log("🖱️ Abriendo modal de invitación...");
      (btnInvite as HTMLElement).click();
      await delay(1500);
      return !!document.querySelector('textarea[data-testid="inviteHostTextArea"]');
    }

    return false;
  }

  private async leerResultadosMasivos(usersOriginales: string[]): Promise<string[]> {
    const disponibles: string[] = [];
    let processedCount = 0;
    const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.semi-table-row'));
    
    for (const row of rows) {
      if (this.abortSignal) break;

      const userCell = row.querySelector('td[aria-colindex="1"], td:first-child');
      const userText = (userCell?.textContent || "").toLowerCase();
      const usernameFound = usersOriginales.find((u) => userText.includes(u.toLowerCase()));

      if (!usernameFound) continue;

      const statusCell = row.querySelector('td[aria-colindex="2"], td:nth-child(2)');
      const statusHtml = statusCell?.innerHTML || "";
      const isOnline = statusHtml.includes("semi-tag-green-light");
      const isForbidden = statusHtml.includes("semi-tag-red-light");

      if (isForbidden) {
        this.log(`⛔ @${usernameFound} -> NO APTO`, "error");
        continue;
      }

      // Detección de Tipo (Elite, Popular, Premium)
      const typeCell = row.querySelector('td[aria-colindex="3"], td:nth-child(3)');
      let creatorType = "Normal";

      if (typeCell) {
        const html = typeCell.innerHTML;
        if (html.includes("#FF9506")) creatorType = "Elite";
        else if (html.includes("#836BFE")) creatorType = "Popular";
        else if (html.includes("#2CB8C5")) creatorType = "Premium";
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
      this.updateProgress(processedCount, usersOriginales.length);
    }

    return disponibles;
  }
}

export const availabilityScraper = new AvailabilityScraperService();
