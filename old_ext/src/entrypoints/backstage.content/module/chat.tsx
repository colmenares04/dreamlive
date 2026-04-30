import { delay, log, DomUtils } from "../utils";
import { browser } from "wxt/browser";

let abortSignal = false;
let isRunning = false;

// Helper: Capitalize first letter of text
function capitalizarNombre(texto: string): string {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Helper: Normalize special fonts and unicode characters
function normalizarFuentesRaras(texto: string): string {
  if (!texto) return "";
  return texto
    .normalize("NFKD") // Decompose complex characters
    .replace(/[\u0300-\u036f]/g, ""); // Remove accent marks
}

function procesarNombreHumano(rawName: string): string {
  if (!rawName) return "";
  let limpio = normalizarFuentesRaras(rawName);
  const adjetivos = [
    "bonita",
    "bonito",
    "linda",
    "lindo",
    "hermosa",
    "hermoso",
    "bella",
    "bello",
    "guapa",
    "guapo",
    "sexy",
    "hot",
    "rica",
    "rico",
    "preciosa",
    "precioso",
    "chula",
    "chulo",
    "bebe",
    "baby",
  ];

  const apellidosComunes = [
    "garcia",
    "garcía",
    "rodriguez",
    "martinez",
    "martínez",
    "hernandez",
    "hernández",
    "lopez",
    "lópez",
    "gonzalez",
    "gonzález",
    "perez",
    "pérez",
    "sanchez",
    "sánchez",
    "ramirez",
    "ramírez",
    "torres",
    "flores",
    "rivera",
    "gomez",
    "gómez",
    "diaz",
    "díaz",
    "cruz",
    "morales",
    "reyes",
    "gutierrez",
    "ortiz",
    "chavez",
    "ruiz",
    "castillo",
    "jimenez",
    "jiménez",
    "nuñez",
    "núñez",
    "mendoza",
  ];

  const palabrasExcluidas = [
    "dr",
    "dra",
    "lic",
    "ing",
    "sr",
    "sra",
    "tio",
    "tia",
    "tío",
    "tía",
    "la",
    "el",
    "los",
    "las",
    "un",
    "una",
    "yo",
    "tu",
    "mi",
    "su",
    "me",
    "te",
    "soy",
    "somos",
    "es",
    "eres",
    "estoy",
    "nombre",
    "name",
    "user",
    "usuario",
    "live",
    "tiktok",
    "tt",
    "oficial",
    "official",
    "real",
    "original",
    "cuenta",
    "account",
    "page",
    "pagina",
    "streams",
    "streaming",
    "gaming",
    "gamer",
    "streamer",
    "channel",
    "canal",
    "tv",
    "ff",
    "freefire",
    "free",
    "fire",
    "pro",
    "player",
    "jugador",
    "escaner",
    "escaneo",
    "scan",
    "automotriz",
    "auto",
    "motor",
    "shop",
    "tienda",
    "bazar",
  ];

  const patronesTikTok =
    /(_oficial|_real|_original|oficial|real|original|_tt|_live|live|streams|_ff|_pro)$/i;

  // Additional cleanup: Remove emojis and TikTok-specific patterns
  limpio = limpio.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    "",
  );
  limpio = limpio.replace(patronesTikTok, "");

  // Smart separation: Detect Mario_Batallas, Mario.Batallas, MarioBatallas
  limpio = limpio.replace(/[0-9._\-]/g, " "); // Convert symbols to spaces
  limpio = limpio.replace(/([a-z])([A-Z])/g, "$1 $2"); // CamelCase to spaces

  // Tokenization and selection
  const partes = limpio.split(/\s+/).filter((p) => p.length > 2);

  for (const parte of partes) {
    const lower = parte.toLowerCase();

    // Filtros de exclusión
    if (palabrasExcluidas.includes(lower)) continue;
    if (adjetivos.includes(lower)) continue;

    // Filtro de apellidos
    if (apellidosComunes.includes(lower) && partes.length > 1) continue;

    // Return first valid name, capitalized
    return capitalizarNombre(parte);
  }

  return "";
}

// Validate name meets technical requirements
function isValidName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 15) return false;
  if (/(.)\1{3,}/.test(name)) return false;
  // Extra validation: Must contain normal letters (after normalization)
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/.test(name)) return false;
  return true;
}

export const ChatModule = {
  async verificarHistorialVacio() {
    log("👀 Analizando historial...", "info");
    await delay(1000);
    const mensajes = document.querySelectorAll(
      '.im-message-layout-bubble, .im-message-item-layout, [class*="message-bubble"]',
    );
    if (mensajes.length > 0) {
      const hayTexto = Array.from(mensajes).some(
        (el) => (el.textContent?.trim().length || 0) > 1,
      );
      if (hayTexto) return false;
    }
    return true;
  },

  async buscarUsuarioChat(username: string) {
    const inputs = Array.from(document.querySelectorAll("input"));
    let searchInput = inputs.find(
      (i) =>
        /search|buscar|creator username/i.test(i.placeholder || "") ||
        i.className.includes("search"),
    ) as HTMLInputElement;

    if (!searchInput)
      searchInput = document.querySelector(
        ".semi-input-default",
      ) as HTMLInputElement;

    if (!searchInput) {
      log("❌ No encuentro el buscador del chat", "error");
      return false;
    }

    log(`🔎 Buscando chat de @${username}...`);

    DomUtils.focusReal(searchInput);
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await delay(100);

    for (const char of username) {
      searchInput.value += char;
      searchInput.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true }),
      );
      await delay(10);
    }

    searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    await delay(300);

    searchInput.focus();
    DomUtils.pressEnter(searchInput);

    const searchBtn = searchInput.parentElement?.querySelector(
      'div[class*="suffix"], svg, [role="button"]',
    );
    if (searchBtn) {
      searchBtn.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    }

    log("⏳ Esperando resultados...");
    await delay(1500);

    try {
      const resultSelector =
        '[data-id="backstage_search_result_item"], div[class*="nameBox"]';
      const primerResultado = await DomUtils.waitFor(resultSelector, 6000);

      if (primerResultado) {
        log("👉 Seleccionando usuario...");
        DomUtils.focusReal(primerResultado as HTMLElement);
        (primerResultado as HTMLElement).click();
        if (primerResultado.parentElement)
          primerResultado.parentElement.click();
        await DomUtils.waitFor(
          "textarea, .im-message-list, .im-chat-window",
          6000,
        );
        return true;
      }
    } catch (e) {
      log(`⚠️ No se encontraron resultados para @${username}`, "error");
    }
    return false;
  },

  async validarUsuarioCorrecto(usernameObjetivo: string) {
    const objetivo = usernameObjetivo.trim().toLowerCase().replace("@", "");
    let intentos = 0;
    while (intentos < 15) {
      const handleElement = document.querySelector(
        'span[class*="handle"] span, .baseInfo--US8MF span[class*="handle"]',
      );
      if (handleElement) {
        let rawText = (handleElement.textContent || "").trim();
        if (
          rawText === "@-" ||
          rawText === "-" ||
          rawText === "@" ||
          rawText === ""
        ) {
          if (intentos % 3 === 0)
            log(`⏳ Renderizando nombre... (${rawText})`, "info");
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
            /search|buscar/i.test(i.placeholder || ""),
        ) as HTMLInputElement;
        if (searchInput) {
          const valInput = searchInput.value.toLowerCase().replace("@", "");
          if (valInput.includes(objetivo)) {
            log(`🛡️ Bypass de Header activado.`, "success");
            return true;
          }
        }
        log(`⛔ Identidad dudosa: @${textoPerfil} vs @${objetivo}`, "error");
        return false;
      }
      await delay(500);
      intentos++;
    }
    return false;
  },

  async escribirYEnviar(mensaje: string) {
    try {
      console.log("[DEBUG] Iniciando escritura de mensaje...");
      console.log("[DEBUG] Mensaje a enviar:", mensaje);

      // Improved selectors with multiple alternatives
      const textarea = (await DomUtils.waitFor(
        ".im-chat-input textarea, .semi-input-textarea, textarea[placeholder*='message'], textarea[class*='input'], textarea[class*='chat']",
        7000,
      )) as HTMLTextAreaElement;

      console.log("[DEBUG] Textarea encontrado:", textarea);
      console.log(
        "[DEBUG] Textarea disabled?",
        textarea?.hasAttribute("disabled"),
      );
      console.log(
        "[DEBUG] Textarea readonly?",
        textarea?.hasAttribute("readonly"),
      );

      if (!textarea) {
        console.error("[DEBUG] No se encontró textarea");
        return false;
      }

      log("Escribiendo mensaje...", "info");

      // Successful strategy from bulk.tsx (atomic and fast)
      console.log("[DEBUG] Usando estrategia setNativeValue (bulk.tsx)...");

      DomUtils.focusReal(textarea);
      console.log("[DEBUG] Focus aplicado");

      // Clear textarea
      DomUtils.setNativeValue(textarea, "");
      console.log("[DEBUG] Textarea limpiado");
      await delay(100);

      // Set value (atomic method, avoids race conditions)
      DomUtils.setNativeValue(textarea, mensaje);
      console.log("[DEBUG] Valor establecido con setNativeValue");
      console.log("[DEBUG] Valor actual del textarea:", textarea.value);
      console.log(
        "[DEBUG] ¿Coinciden?",
        textarea.value.trim() === mensaje.trim(),
      );
      await delay(800);

      // Verify value was set correctly
      if (textarea.value.trim().length === 0) {
        console.error(
          "[DEBUG] Textarea vacío después de setNativeValue, intentando fallback...",
        );

        // Fallback: Direct native injection
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value",
        )?.set;

        if (nativeSetter) {
          console.log("[DEBUG] Usando nativeSetter como fallback...");
          nativeSetter.call(textarea, mensaje);
          textarea.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              inputType: "insertText",
            }),
          );
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("[DEBUG] Fallback aplicado");
          await delay(500);
        }

        // Final verification
        if (textarea.value.trim().length === 0) {
          console.error("[DEBUG] Textarea sigue vacío después de fallback");
          return false;
        }
      }

      console.log("[DEBUG] Valor final del textarea:", textarea.value);

      // Find send button
      const getSendBtn = () =>
        document.querySelector(
          'button[data-id="backstage_IM_send_btn"], .im-btn-send, button[class*="send"]',
        );
      let sendBtn = getSendBtn();

      console.log("[DEBUG] Botón de envío encontrado:", sendBtn);
      console.log("[DEBUG] Botón disabled?", sendBtn?.hasAttribute("disabled"));
      console.log(
        "[DEBUG] Botón aria-disabled?",
        sendBtn?.getAttribute("aria-disabled"),
      );

      // Try to reactivate button if disabled
      if (
        sendBtn &&
        (sendBtn.hasAttribute("disabled") ||
          sendBtn.getAttribute("aria-disabled") === "true")
      ) {
        console.log("[DEBUG] Botón deshabilitado, intentando reactivar...");
        textarea.focus();

        // Trigger to reactivate button
        textarea.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
          }),
        );
        await delay(300);

        sendBtn = getSendBtn();
        console.log("[DEBUG] Estado del botón después de reactivación:", {
          disabled: sendBtn?.hasAttribute("disabled"),
          ariaDisabled: sendBtn?.getAttribute("aria-disabled"),
        });
      }

      // Send message
      if (sendBtn) {
        if (sendBtn.hasAttribute("disabled")) {
          console.log("[DEBUG] Removiendo atributo disabled del botón...");
          sendBtn.removeAttribute("disabled");
          sendBtn.classList.remove("disabled", "im-btn-disabled");
        }
        console.log("[DEBUG] Haciendo click en botón de envío...");
        (sendBtn as HTMLElement).click();
        log("Mensaje enviado.", "success");
        return true;
      }

      // Fallback: Enter
      console.log("[DEBUG] Botón no encontrado, intentando Enter...");
      if (textarea.value.trim().length > 0) {
        DomUtils.pressEnter(textarea);
        console.log("[DEBUG] Enter presionado");
        log("Mensaje enviado (Enter).", "success");
        return true;
      }

      console.error("[DEBUG] No se pudo enviar el mensaje");
      return false;
    } catch (e) {
      console.error("[DEBUG] Error completo:", e);
      log("Error escribir: " + e, "error");
      return false;
    }
  },

  getNicknameFromDom(): string | null {
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
  },

  abort() {
    if (abortSignal) return;
    log("🛑 Proceso detenido.", "info");
    abortSignal = true;
  },

  async processFlow(
    leads: string[],
    templates: string[],
    targetSuccessCount: number = 9999,
  ) {
    if (isRunning) {
      log("⚠️ Proceso ya activo.", "info");
      return;
    }
    if (!leads || leads.length === 0) return;

    const MAX_ENVIOS = Number(targetSuccessCount) || 9999;
    isRunning = true;
    abortSignal = false;
    log(`📨 Iniciando campaña (Meta: ${MAX_ENVIOS})...`);

    let enviados = 0;
    let errores = 0;
    let saltados = 0;
    let limiteAlcanzado = false;

    for (const username of leads) {
      if (enviados >= MAX_ENVIOS) {
        log(`✅ Meta alcanzada (${enviados}).`, "success");
        limiteAlcanzado = true;
        break;
      }

      if (abortSignal) break;

      try {
        const encontrado = await this.buscarUsuarioChat(username);
        if (abortSignal) break;

        if (encontrado) {
          log("⏳ Cargando perfil...", "info");
          await delay(4000);

          if (!(await this.validarUsuarioCorrecto(username))) {
            saltados++;
            continue;
          }

          if (!(await this.verificarHistorialVacio())) {
            log(`⏭️ Conversación previa. Omitiendo...`, "info");
            saltados++;
            browser.runtime.sendMessage({ type: "DELETE_LEAD", username });
          } else {
            // PROCESAMIENTO DE NOMBRES ACTUALIZADO
            let nombreFinal = "";

            // 1. Desde el username
            let nombreDesdeUser = procesarNombreHumano(username);

            // 2. Desde el DOM
            const realNick = this.getNicknameFromDom();
            let nombreDesdeDom = realNick ? procesarNombreHumano(realNick) : "";

            // 3. Selección del mejor candidato
            if (isValidName(nombreDesdeDom)) {
              nombreFinal = nombreDesdeDom;
            } else if (isValidName(nombreDesdeUser)) {
              nombreFinal = nombreDesdeUser;
            }

            // nombreFinal ya vendrá capitalizado por la función procesarNombreHumano

            // Validate templates
            console.log("[TEMPLATES DEBUG] ==================");
            console.log("[TEMPLATES DEBUG] Templates array:", templates);
            console.log(
              "[TEMPLATES DEBUG] Templates length:",
              templates?.length,
            );
            console.log(
              "[TEMPLATES DEBUG] Templates es array?",
              Array.isArray(templates),
            );
            console.log("[TEMPLATES DEBUG] ==================");

            // Robust fallback system for templates
            let template = "";

            // 1. Validate templates is a valid array
            if (!Array.isArray(templates) || templates.length === 0) {
              console.error(
                "[TEMPLATES DEBUG] Array de templates inválido o vacío!",
              );
              // Fallback: use default template
              template =
                "Hola {username}, me gusta tu contenido. Quisiera poder contactarme contigo para hablar acerca de algo.";
              console.log(
                "[TEMPLATES DEBUG] Usando template por defecto:",
                template,
              );
            } else {
              // 2. Filter empty templates
              const validTemplates = templates.filter(
                (t) => t && typeof t === "string" && t.trim().length > 0,
              );

              console.log(
                "[TEMPLATES DEBUG] Templates válidos encontrados:",
                validTemplates.length,
              );

              if (validTemplates.length === 0) {
                console.error(
                  "[TEMPLATES DEBUG] Todos los templates están vacíos!",
                );
                // Fallback: use default template
                template =
                  "Hola {username}, me gusta tu contenido. Quisiera poder contactarme contigo para hablar acerca de algo.";
                console.log(
                  "[TEMPLATES DEBUG] Usando template por defecto:",
                  template,
                );
              } else {
                // 3. Select random template from valid ones
                template =
                  validTemplates[
                    Math.floor(Math.random() * validTemplates.length)
                  ];
                console.log(
                  "[TEMPLATES DEBUG] Template seleccionado:",
                  template,
                );
              }
            }

            // 4. Final validation (just in case)
            if (!template || template.trim().length === 0) {
              console.error(
                "[TEMPLATES DEBUG] Template final está vacío! Esto no debería pasar.",
              );
              // Last fallback
              template =
                "Hola {username}, me gusta tu contenido. Quisiera poder contactarme contigo para hablar acerca de algo.";
              console.log(
                "[TEMPLATES DEBUG] Usando último fallback:",
                template,
              );
            }

            const mensajeFinal = nombreFinal
              ? template.replace(/{username}|{nombre}/g, nombreFinal)
              : template
                  .replace(/{username}|{nombre}/g, "")
                  .replace(/\s+/g, " ")
                  .trim();

            // Show message information
            console.log("[MENSAJE DEBUG] ==================");
            console.log("[MENSAJE DEBUG] Username:", username);
            console.log("[MENSAJE DEBUG] Nombre desde user:", nombreDesdeUser);
            console.log("[MENSAJE DEBUG] Nombre desde DOM:", nombreDesdeDom);
            console.log(
              "[MENSAJE DEBUG] Nombre final seleccionado:",
              nombreFinal,
            );
            console.log("[MENSAJE DEBUG] Template original:", template);
            console.log(
              "[MENSAJE DEBUG] Mensaje final generado:",
              mensajeFinal,
            );
            console.log(
              "[MENSAJE DEBUG] Longitud del mensaje:",
              mensajeFinal.length,
            );
            console.log("[MENSAJE DEBUG] ==================");

            if (await this.escribirYEnviar(mensajeFinal)) {
              browser.runtime.sendMessage({
                type: "LEAD_CONTACTED_SUCCESS",
                username,
              });
              enviados++;
              if (enviados >= MAX_ENVIOS) {
                log(`✅ Meta alcanzada.`, "success");
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
        log(`❌ Error crítico`, "error");
        errores++;
      }

      if (!abortSignal && !limiteAlcanzado) {
        await delay(1500 + Math.random() * 1000);
      }
    }

    isRunning = false;
    if (abortSignal) log("🛑 Detenido.", "info");
    else log(`🏁 Fin. Enviados: ${enviados} | Saltados: ${saltados}`, "info");

    browser.runtime.sendMessage({
      type: "BATCH_COMPLETED",
      stats: { enviados, errores, saltados, total: leads.length },
      limitReached: limiteAlcanzado,
    });
  },
};
