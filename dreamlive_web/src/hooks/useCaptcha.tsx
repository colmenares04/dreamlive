/**
 * Hook y componente para Google reCAPTCHA v2.
 * Requiere VITE_RECAPTCHA_SITE_KEY en .env.local
 */
import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; theme?: string }) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
      execute: (widgetId?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

interface UseCaptchaOptions {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark';
}

export function useCaptcha({ onVerify, onExpire, theme = 'light' }: UseCaptchaOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  // Flag persistente que no se resetea en el cleanup de Strict Mode
  const isRenderedRef = useRef<boolean>(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

  const renderCaptcha = useCallback(() => {
    if (!containerRef.current || !siteKey || !window.grecaptcha) return;
    // Verificar si ya hay un widget activo usando el flag persistente
    if (isRenderedRef.current && widgetIdRef.current !== null) return;

    // Limpiar cualquier contenido residual del DOM antes de renderizar
    containerRef.current.innerHTML = '';
    isRenderedRef.current = false;

    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': () => {
          widgetIdRef.current = null;
          isRenderedRef.current = false;
          onExpire?.();
        },
        theme,
      });
      isRenderedRef.current = true;
    } catch (error) {
      console.error('Error rendering reCAPTCHA:', error);
      isRenderedRef.current = false;
    }
  }, [siteKey, onVerify, onExpire, theme]);

  useEffect(() => {
    if (!siteKey) return;

    // Pequeño delay para evitar colisión con React 18 Strict Mode double-invoke
    const timer = setTimeout(() => {
      if (window.grecaptcha) {
        renderCaptcha();
      } else {
        window.onRecaptchaLoad = renderCaptcha;
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      // NO reseteamos isRenderedRef aquí para que el segundo mount de Strict Mode
      // encuentre el flag activo y no vuelva a renderizar
    };
  }, [renderCaptcha, siteKey]);

  const reset = useCallback(() => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
      widgetIdRef.current = null;
      isRenderedRef.current = false;
    }
  }, []);

  return { containerRef, reset, isEnabled: !!siteKey };
}

// ── Componente visual ─────────────────────────────────────────────────────────
interface CaptchaBoxProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function CaptchaBox({ onVerify, onExpire }: CaptchaBoxProps) {
  const { containerRef, isEnabled } = useCaptcha({ onVerify, onExpire, theme: 'light' });
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!isEnabled || !siteKey) {
    return (
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
        <p className="text-amber-600 text-xs font-medium">
          ⚠️ reCAPTCHA no configurado.{' '}
          <code className="bg-amber-100 px-1 rounded">VITE_RECAPTCHA_SITE_KEY</code>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex justify-center">
      <div ref={containerRef} />
    </div>
  );
}
