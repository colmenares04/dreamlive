/**
 * DOM Automation Utilities
 * Helpers for human-like interaction and DOM monitoring.
 */

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const DomUtils = {
  /**
   * Focuses an element simulating real user interaction
   */
  focusReal(el: HTMLElement) {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.click();
    (el as HTMLElement).focus();
  },

  /**
   * Sets a value in an input or textarea bypassing standard React/Vue event blocks
   */
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

  /**
   * Types text like a human with random delays
   */
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

  /**
   * Simulates pressing the Enter key
   */
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

  /**
   * Waits for an element to appear in the DOM using MutationObserver
   */
  waitFor(selector: string, timeout = 10000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) {
        return resolve(existing as HTMLElement);
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el as HTMLElement);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout esperando elemento: ${selector}`));
      }, timeout);
    });
  },

  /**
   * Polling version of waitFor that allows cancellation via checkFn
   */
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
          reject(new Error("ABORTED_BY_SIGNAL"));
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
      }, 300);
    });
  },
};
