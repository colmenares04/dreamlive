// Helpers de tiempo y logging
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const log = (
  msg: string,
  type: "info" | "success" | "error" = "info",
) => {
  document.dispatchEvent(
    new CustomEvent("dreamlive-backstage-event", {
      detail: { type: "LOG", message: msg, data: { type } },
    }),
  );
};

// --- SIMULACIÓN DE INTERACCIÓN HUMANA ---

export const DomUtils = {
  focusReal(el: HTMLElement) {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.click();
    (el as HTMLElement).focus();
  },

  setNativeValue(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
  ) {
    const proto =
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  },

  async typeLikeHuman(
    element: HTMLInputElement | HTMLTextAreaElement,
    text: string,
  ) {
    let current = "";
    for (const char of text) {
      current += char;
      this.setNativeValue(element, current);
      await delay(30 + Math.random() * 50);
    }
  },

  pressEnter(input: HTMLInputElement | HTMLTextAreaElement) {
    const eventInit: KeyboardEventInit = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    input.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    input.dispatchEvent(new KeyboardEvent("keypress", eventInit));
    input.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  },
  waitFor(selector: string, timeout = 10000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      // 1. Si ya existe, retornar inmediatamente
      const existing = document.querySelector(selector);
      if (existing) {
        return resolve(existing as HTMLElement);
      }
      // 2. Si no, configurar un observador
      const observer = new MutationObserver((mutations) => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect(); // Dejar de observar
          resolve(el as HTMLElement);
        }
      });
      // 3. Empezar a observar todo el cuerpo del documento
      observer.observe(document.body, {
        childList: true, // Observar hijos directos
        subtree: true, // Observar nietos y bisnietos (profundidad)
      });
      // 4. Timeout de seguridad por si nunca aparece
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout esperando elemento: ${selector}`));
      }, timeout);
    });
  },

  // Versión "Polling" que permite cancelar si checkFn devuelve true (abort)
  waitWithCheck(
    selector: string,
    timeout = 10000,
    checkFn: () => boolean,
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (checkFn()) {
          clearInterval(interval);
          reject(new Error("ABORTED_BY_signal"));
          return;
        }
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el as HTMLElement);
          return;
        }
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout esperando elemento: ${selector}`));
        }
      }, 300); // Check every 300ms
    });
  },
};
