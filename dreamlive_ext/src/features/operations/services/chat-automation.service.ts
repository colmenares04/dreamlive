import { browser } from 'wxt/browser';
import { DomUtils, delay } from './dom-automation.utils';

export interface ScraperCallbacks {
  onLog?: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onProgress?: (current: number, total: number) => void;
  onStatusChange?: (isRunning: boolean) => void;
}

export class ChatAutomationService {
  private static instance: ChatAutomationService;
  private abortSignal = false;
  private isRunning = false;
  private callbacks: ScraperCallbacks = {};

  private constructor() {}

  public static getInstance(): ChatAutomationService {
    if (!ChatAutomationService.instance) {
      ChatAutomationService.instance = new ChatAutomationService();
    }
    return ChatAutomationService.instance;
  }

  public setCallbacks(callbacks: ScraperCallbacks) {
    this.callbacks = callbacks;
  }

  private log(msg: string, type: 'info' | 'success' | 'error' = 'info') {
    if (this.callbacks.onLog) {
      this.callbacks.onLog(msg, type);
    } else {
      console.log(`[ChatAutomationService] [${type.toUpperCase()}] ${msg}`);
    }
  }

  private progress(current: number, total: number) {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(current, total);
    }
  }

  private statusChange(isRunning: boolean) {
    this.isRunning = isRunning;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(isRunning);
    }
  }

  // --- Helpers de Texto ---
  public capitalizarNombre(texto: string): string {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  public normalizarFuentesRaras(texto: string): string {
    if (!texto) return "";
    return texto
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  public procesarNombreHumano(rawName: string): string {
    if (!rawName) return "";
    let limpio = this.normalizarFuentesRaras(rawName);
    const adjetivos = [
      "bonita", "bonito", "linda", "lindo", "hermosa", "hermoso", "bella", "bello",
      "guapa", "guapo", "sexy", "hot", "rica", "rico", "preciosa", "precioso",
      "chula", "chulo", "bebe", "baby"
    ];

    const apellidosComunes = [
      "garcia", "garcía", "rodriguez", "martinez", "martínez", "hernandez",
      "hernández", "lopez", "lópez", "gonzalez", "gonzález", "perez", "pérez",
      "sanchez", "sánchez", "ramirez", "ramírez", "torres", "flores", "rivera",
      "gomez", "gómez", "diaz", "díaz", "cruz", "morales", "reyes", "gutierrez",
      "ortiz", "chavez", "ruiz", "castillo", "jimenez", "jiménez", "nuñez",
      "núñez", "mendoza"
    ];

    const palabrasExcluidas = [
      "dr", "dra", "lic", "ing", "sr", "sra", "tio", "tia", "tío", "tía",
      "la", "el", "los", "las", "un", "una", "yo", "tu", "mi", "su", "me", "te",
      "soy", "somos", "es", "eres", "estoy", "nombre", "name", "user", "usuario",
      "live", "tiktok", "tt", "oficial", "official", "real", "original", "cuenta",
      "account", "page", "pagina", "streams", "streaming", "gaming", "gamer",
      "streamer", "channel", "canal", "tv", "ff", "freefire", "free", "fire",
      "pro", "player", "jugador", "escaner", "escaneo", "scan", "automotriz",
      "auto", "motor", "shop", "tienda", "bazar"
    ];

    const patronesTikTok =
      /(_oficial|_real|_original|oficial|real|original|_tt|_live|live|streams|_ff|_pro)$/i;

    limpio = limpio.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      "",
    );
    limpio = limpio.replace(patronesTikTok, "");

    limpio = limpio.replace(/[0-9._\-]/g, " ");
    limpio = limpio.replace(/([a-z])([A-Z])/g, "$1 $2");

    const partes = limpio.split(/\s+/).filter((p) => p.length > 2);

    for (const parte of partes) {
      const lower = parte.toLowerCase();

      if (palabrasExcluidas.includes(lower)) continue;
      if (adjetivos.includes(lower)) continue;

      if (apellidosComunes.includes(lower) && partes.length > 1) continue;

      return this.capitalizarNombre(parte);
    }

    return "";
  }

  public isValidName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 15) return false;
    if (/(.)\1{3,}/.test(name)) return false;
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/.test(name)) return false;
    return true;
  }

  public async verificarHistorialVacio(): Promise<boolean> {
    this.log("👀 Analizando historial...", "info");
    await delay(1000);
    const mensajes = document.querySelectorAll(
      '.im-message-layout-bubble, .im-message-item-layout, [class*="message-bubble"]'
    );
    if (mensajes.length > 0) {
      const hayTexto = Array.from(mensajes).some(
        (el) => (el.textContent?.trim().length || 0) > 1
      );
      if (hayTexto) return false;
    }
    return true;
  }

  public async buscarUsuarioChat(username: string): Promise<boolean> {
    let searchInput = document.querySelector(
      'input[placeholder*="Creator" i], input[placeholder*="username" i], .searchWrapper--sKAWx input, .semi-input-default[enterkeyhint="search"]'
    ) as HTMLInputElement;

    if (!searchInput) {
      const inputs = Array.from(document.querySelectorAll("input"));
      searchInput = inputs.find(
        (i) =>
          /search|buscar|creator username/i.test(i.placeholder || "") ||
          i.className.includes("search")
      ) as HTMLInputElement;
    }

    if (!searchInput)
      searchInput = document.querySelector(".semi-input-default") as HTMLInputElement;

    if (!searchInput) {
      this.log("❌ No encuentro el buscador del chat", "error");
      return false;
    }

    this.log(`🔎 Buscando chat de @${username}...`);

    DomUtils.focusReal(searchInput);
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await delay(100);

    for (const char of username) {
      searchInput.value += char;
      searchInput.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      );
      await delay(10);
    }

    searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    await delay(300);

    searchInput.focus();
    DomUtils.pressEnter(searchInput);

    const searchBtn = searchInput.parentElement?.querySelector(
      'div[class*="suffix"], svg, [role="button"]'
    );
    if (searchBtn) {
      searchBtn.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    }

    this.log("⏳ Esperando resultados...");
    await delay(1500);

    try {
      const resultSelector = '[data-id="backstage_search_result_item"], div[class*="nameBox"]';
      const primerResultado = await DomUtils.waitFor(resultSelector, 6000);

      if (primerResultado) {
        this.log("👉 Seleccionando usuario...");
        DomUtils.focusReal(primerResultado as HTMLElement);
        (primerResultado as HTMLElement).click();
        if (primerResultado.parentElement)
          primerResultado.parentElement.click();
        await DomUtils.waitFor("textarea, .im-message-list, .im-chat-window", 6000);
        return true;
      }
    } catch (e) {
      this.log(`⚠️ No se encontraron resultados para @${username}`, "error");
    }
    return false;
  }

  public async validarUsuarioCorrecto(usernameObjetivo: string): Promise<boolean> {
    const objetivo = usernameObjetivo.trim().toLowerCase().replace("@", "");
    let intentos = 0;
    while (intentos < 15) {
      const handleElement = document.querySelector(
        'span[class*="handle"] span, .baseInfo--US8MF span[class*="handle"]'
      );
      if (handleElement) {
        let rawText = (handleElement.textContent || "").trim();
        if (rawText === "@-" || rawText === "-" || rawText === "@" || rawText === "") {
          if (intentos % 3 === 0)
            this.log(`⏳ Renderizando nombre... (${rawText})`, "info");
          await delay(500);
          intentos++;
          continue;
        }
        const textoPerfil = rawText.toLowerCase().replace("@", "");
        if (textoPerfil === objetivo) return true;
        if (textoPerfil.includes(objetivo) || objetivo.includes(textoPerfil))
          return true;

        const inputs = Array.from(document.querySelectorAll("input"));
        const searchInput = inputs.find(
          (i) =>
            i.className.includes("search") ||
            /search|buscar/i.test(i.placeholder || "")
        ) as HTMLInputElement;
        if (searchInput) {
          const valInput = searchInput.value.toLowerCase().replace("@", "");
          if (valInput.includes(objetivo)) {
            this.log(`🛡️ Bypass de Header activado.`, "success");
            return true;
          }
        }
        this.log(`⛔ Identidad dudosa: @${textoPerfil} vs @${objetivo}`, "error");
        return false;
      }
      await delay(500);
      intentos++;
    }
    return false;
  }

  public async escribirYEnviar(mensaje: string): Promise<boolean> {
    try {
      console.log("[DEBUG] Iniciando escritura de mensaje...");
      console.log("[DEBUG] Mensaje a enviar:", mensaje);

      const textarea = (await DomUtils.waitFor(
        ".im-chat-input textarea, .semi-input-textarea, textarea[placeholder*='message'], textarea[class*='input'], textarea[class*='chat']",
        7000,
      )) as HTMLTextAreaElement;

      console.log("[DEBUG] Textarea encontrado:", textarea);

      if (!textarea) {
        console.error("[DEBUG] No se encontró textarea");
        return false;
      }

      this.log("Escribiendo mensaje...", "info");

      DomUtils.focusReal(textarea);
      DomUtils.setNativeValue(textarea, "");
      await delay(100);

      DomUtils.setNativeValue(textarea, mensaje);
      await delay(800);

      if (textarea.value.trim().length === 0) {
        console.error("[DEBUG] Textarea vacío después de setNativeValue, intentando fallback...");
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;

        if (nativeSetter) {
          nativeSetter.call(textarea, mensaje);
          textarea.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              inputType: "insertText",
            })
          );
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
          await delay(500);
        }

        if (textarea.value.trim().length === 0) {
          return false;
        }
      }

      const getSendBtn = () =>
        document.querySelector(
          'button[data-id="backstage_IM_send_btn"], .im-btn-send, button[class*="send"]'
        );
      let sendBtn = getSendBtn();

      if (
        sendBtn &&
        (sendBtn.hasAttribute("disabled") ||
          sendBtn.getAttribute("aria-disabled") === "true")
      ) {
        textarea.focus();
        textarea.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
          })
        );
        await delay(300);
        sendBtn = getSendBtn();
      }

      if (sendBtn) {
        if (sendBtn.hasAttribute("disabled")) {
          sendBtn.removeAttribute("disabled");
          sendBtn.classList.remove("disabled", "im-btn-disabled");
        }
        (sendBtn as HTMLElement).click();
        this.log("Mensaje enviado.", "success");
        return true;
      }

      if (textarea.value.trim().length > 0) {
        DomUtils.pressEnter(textarea);
        this.log("Mensaje enviado (Enter).", "success");
        return true;
      }

      return false;
    } catch (e) {
      this.log("Error escribir: " + e, "error");
      return false;
    }
  }

  public getNicknameFromDom(): string | null {
    const selectors = [
      ".nickName--_YSNB",
      'span[class*="nickName"]',
      'h1[class*="title"]',
      'span[class*="title"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) return el.textContent.trim();
    }
    return null;
  }

  public abort() {
    if (this.abortSignal) return;
    this.log("🛑 Proceso detenido.", "info");
    this.abortSignal = true;
  }

  public async start(leads: string[], templates: string[], limit: number = 9999, total: number = 0) {
    if (this.isRunning) {
      this.log("⚠️ Proceso ya activo.", "info");
      return;
    }
    if (!leads || leads.length === 0) return;

    const MAX_ENVIOS = Number(limit) || 9999;
    this.statusChange(true);
    this.abortSignal = false;
    this.log(`📨 Iniciando campaña (Meta: ${MAX_ENVIOS})...`);

    const totalSession = total > 0 ? total : leads.length;
    let enviados = 0;
    let errores = 0;
    let saltados = 0;
    let limiteAlcanzado = false;

    for (let i = 0; i < leads.length; i++) {
      const username = leads[i];
      this.progress(i + 1, totalSession);

      if (enviados >= MAX_ENVIOS) {
        this.log(`✅ Meta alcanzada (${enviados}).`, "success");
        limiteAlcanzado = true;
        break;
      }

      if (this.abortSignal) break;

      try {
        const encontrado = await this.buscarUsuarioChat(username);
        if (this.abortSignal) break;

        if (encontrado) {
          this.log("⏳ Cargando perfil...", "info");
          await delay(4000);

          if (!(await this.validarUsuarioCorrecto(username))) {
            saltados++;
            continue;
          }

          if (!(await this.verificarHistorialVacio())) {
            this.log(`⏭️ Conversación previa. Omitiendo...`, "info");
            saltados++;
            await browser.runtime.sendMessage({ type: "DELETE_LEAD", username });
            continue;
          } else {
            let nombreFinal = "";

            let nombreDesdeUser = this.procesarNombreHumano(username);

            const realNick = this.getNicknameFromDom();
            let nombreDesdeDom = realNick ? this.procesarNombreHumano(realNick) : "";

            if (this.isValidName(nombreDesdeDom)) {
              nombreFinal = nombreDesdeDom;
            } else if (this.isValidName(nombreDesdeUser)) {
              nombreFinal = nombreDesdeUser;
            }

            let template = "";
            if (!Array.isArray(templates) || templates.length === 0) {
              template = "Hola {username}, me gusta tu contenido. Quisiera poder contactarme contigo para hablar acerca de algo.";
            } else {
              const validTemplates = templates.filter(
                (t) => t && typeof t === "string" && t.trim().length > 0
              );
              if (validTemplates.length === 0) {
                template = "Hola {username}, me gusta tu contenido. Quisiera poder contactarme contigo para hablar acerca de algo.";
              } else {
                template = validTemplates[Math.floor(Math.random() * validTemplates.length)];
              }
            }

            const mensajeFinal = nombreFinal
              ? template.replace(/{username}|{nombre}/g, nombreFinal)
              : template
                  .replace(/{username}|{nombre}/g, "")
                  .replace(/\s+/g, " ")
                  .trim();

            if (await this.escribirYEnviar(mensajeFinal)) {
              const res = await browser.runtime.sendMessage({
                type: "LEAD_CONTACTED_SUCCESS",
                username,
              });
              if (res && (!res.success || res.error || res.status === 429)) {
                if (res.status === 429 || (res.error && (res.error.includes("límite") || res.error.includes("429")))) {
                  this.log("🛑 Límite de licencia alcanzado. Pausando envíos.", "error");
                  limiteAlcanzado = true;
                  break;
                }
              }
              enviados++;
              if (enviados >= MAX_ENVIOS) {
                this.log(`✅ Meta alcanzada.`, "success");
                limiteAlcanzado = true;
                break;
              }
            } else {
              errores++;
            }
          }
        } else {
          errores++;
        }
      } catch (err) {
        this.log(`❌ Error crítico: ${err}`, "error");
        errores++;
      }

      if (!this.abortSignal && !limiteAlcanzado) {
        await delay(1500 + Math.random() * 1000);
      }
    }

    this.statusChange(false);
    if (this.abortSignal) this.log("🛑 Detenido.", "info");
    else this.log(`🏁 Fin. Enviados: ${enviados} | Saltados: ${saltados}`, "info");

    browser.runtime.sendMessage({
      type: "BATCH_COMPLETED",
      stats: { enviados, errores, saltados, total: leads.length },
      limitReached: limiteAlcanzado,
    });
  }
}
