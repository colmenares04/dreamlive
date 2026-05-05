import React, { useState, useEffect } from 'react';
import { ListPlus, Search, Send, Activity, AlertCircle, Eye, X } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { browser } from 'wxt/browser';
import { apiClient } from '../../../infrastructure/api/apiClient';

export type ModalType =
  | 'RECOPILAR'
  | 'DISPONIBILIDAD'
  | 'CONTACTAR'
  | 'HISTORY_RECOPILAR'
  | 'HISTORY_DISPONIBILIDAD'
  | 'HISTORY_CONTACTAR'
  | null;

const ROUTES = {
  RECOPILAR: 'tiktok.com/search/live',
  DISPONIBILIDAD: 'live-backstage.tiktok.com/portal/anchor/relation',
  CONTACTAR: 'live-backstage.tiktok.com/portal/anchor/instant-messages',
  HISTORY_RECOPILAR: 'tiktok.com',
  HISTORY_DISPONIBILIDAD: 'live-backstage.tiktok.com',
  HISTORY_CONTACTAR: 'live-backstage.tiktok.com',
};

const URLS = {
  RECOPILAR: 'https://www.tiktok.com/search/live?q=live',
  DISPONIBILIDAD: 'https://live-backstage.tiktok.com/portal/anchor/relation',
  CONTACTAR: 'https://live-backstage.tiktok.com/portal/anchor/instant-messages',
  HISTORY_RECOPILAR: 'https://www.tiktok.com/search/live?q=live',
  HISTORY_DISPONIBILIDAD: 'https://live-backstage.tiktok.com/portal/anchor/relation',
  HISTORY_CONTACTAR: 'https://live-backstage.tiktok.com/portal/anchor/instant-messages',
};

export const OperationsConsole: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [counts, setCounts] = useState({
    RECOPILAR: 0,
    DISPONIBILIDAD: 0,
    CONTACTAR: 0,
  });
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Función para actualizar la URL actual con múltiples fallbacks para asegurar máxima precisión
  const updateCurrentUrl = async () => {
    console.log('[OperationsConsole] updateCurrentUrl invocada.');
    try {

      if (typeof browser.tabs === 'undefined' || !browser.tabs.query) {
        console.log(`[OperationsConsole] browser.tabs.query no está disponible. Usando window.location.href: "${window.location.href}"`);
        setCurrentUrl(window.location.href);
        return;
      }

      // 1. Intentar con query general para pestañas activas
      let tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
      console.log(`[OperationsConsole] Query active & lastFocusedWindow tabs:`, tabs?.map(t => t.url));
      if (!tabs || tabs.length === 0) {
        tabs = await browser.tabs.query({ active: true });
        console.log(`[OperationsConsole] Query only active tabs fallback:`, tabs?.map(t => t.url));
      }
      if (!tabs || tabs.length === 0) {
        tabs = await browser.tabs.query({ active: true, currentWindow: true });
        console.log(`[OperationsConsole] Query active & currentWindow fallback:`, tabs?.map(t => t.url));
      }

      if (tabs && tabs[0]?.url) {
        console.log(`[OperationsConsole] URL detectada desde tabs activa: "${tabs[0].url}"`);
        setCurrentUrl(tabs[0].url);
        return;
      }

      // 2. Si no funciona, buscar pestañas de tiktok o live-backstage
      const allTabs = await browser.tabs.query({});
      console.log(`[OperationsConsole] Buscando en todas las pestañas (${allTabs?.length}):`, allTabs?.map(t => t.url));
      const activeTiktokTab = allTabs.find(t =>
        t.url?.includes('tiktok.com') || t.url?.includes('live-backstage.tiktok.com')
      );
      if (activeTiktokTab?.url) {
        console.log(`[OperationsConsole] URL de TikTok/Backstage detectada de respaldo: "${activeTiktokTab.url}"`);
        setCurrentUrl(activeTiktokTab.url);
      } else {
        console.log(`[OperationsConsole] Ninguna pestaña de TikTok/Backstage encontrada. Usando window.location.href: "${window.location.href}"`);
        setCurrentUrl(window.location.href);
      }
    } catch (e) {
      console.warn('[OperationsConsole] Error fetching active tab url:', e);
      setCurrentUrl(window.location.href);
    }
  };

  // Función para procesar y guardar métricas
  const updateAndSaveCounts = async (data: any) => {
    try {
      let col = 0;
      let av = 0;
      let con = 0;
      for (const lid of Object.keys(data)) {
        col += data[lid].collected || 0;
        av += data[lid].available || 0;
        con += data[lid].contacted || 0;
      }

      // Lógica de contadores orientada a "Pendientes":
      // - RECOPILAR: Muestra cuántos leads hemos capturado (collected).
      // - DISPONIBILIDAD: Muestra cuántos leads están esperando ser verificados (collected).
      // - CONTACTAR: Muestra cuántos leads ya son 'disponibles' y esperan el mensaje (available).
      const newCounts = {
        RECOPILAR: col,
        DISPONIBILIDAD: av,
        CONTACTAR: con,
      };

      setCounts(newCounts);
      await browser.storage.local.set({ cachedMetrics: data, cachedCounts: newCounts });
    } catch (e) {
      console.error('Error updating counts:', e);
    }
  };

  // Función para obtener las métricas reales del servidor
  const fetchMetrics = async () => {
    try {
      const res = await apiClient.get<any>('/licenses/metrics');
      if (res && (res.status === 401 || res.status === 403 || res.error)) {
        // Error o licencia inactiva/cerrada: cerramos todo
        await browser.storage.local.set({ activeOperationsModal: null });
        setActiveModal(null);
        await browser.runtime.sendMessage({ type: 'FORCE_CLOSE_MODALS' }).catch(() => { });
        return;
      }
      if (res && res.data) {
        await updateAndSaveCounts(res.data);
      }
    } catch (e) {
      console.error('Error fetching metrics in operations console:', e);
    }
  };

  // Carga inicial desde storage
  useEffect(() => {
    browser.storage.local.get(['cachedCounts', 'cachedMetrics']).then(res => {
      if (res.cachedCounts) {
        setCounts(res.cachedCounts as { RECOPILAR: number; DISPONIBILIDAD: number; CONTACTAR: number; });
      }
    });
  }, []);

  // Efecto para monitoreo dinámico (Loop de 1 segundo para la URL y 6 segundos para métricas)
  useEffect(() => {
    updateCurrentUrl(); // Primera carga inmediata
    fetchMetrics(); // Primer fetch inmediato

    const urlInterval = setInterval(() => {
      updateCurrentUrl();
    }, 1000);

    const metricsInterval = setInterval(() => {
      fetchMetrics();
    }, 6000);

    return () => {
      clearInterval(urlInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  useEffect(() => {
    browser.storage.local.get('activeOperationsModal').then((res) => {
      if (res.activeOperationsModal) setActiveModal(res.activeOperationsModal as ModalType);
    });

    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes.activeOperationsModal) {
        setActiveModal(changes.activeOperationsModal.newValue as ModalType);
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);

    const handleMessage = (msg: any) => {
      // Sincronización en vivo de los contadores cuando se completa una acción
      if (msg.type === 'LEAD_CONTACTED_SUCCESS' || msg.type === 'MARK_CONTACTED') {
        setCounts(prev => ({
          ...prev,
          CONTACTAR: prev.CONTACTAR + 1
        }));
      }
      if (msg.type === 'LEAD_SAVED_CONFIRMATION') {
        setCounts(prev => ({
          ...prev,
          RECOPILAR: prev.RECOPILAR + 1
        }));
      }
    };
    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const isCurrentRouteValid = async (id: ModalType): Promise<boolean> => {
    if (!id || !(id in ROUTES)) return true;

    let urlStr = window.location.href.toLowerCase();
    try {
      if (typeof browser.tabs !== 'undefined' && browser.tabs.query) {
        let tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tabs || tabs.length === 0) {
          tabs = await browser.tabs.query({ active: true, currentWindow: true });
        }
        if (tabs && tabs[0]?.url) {
          urlStr = tabs[0].url.toLowerCase();
        }
      }
    } catch (e) {
      console.warn('Error querying tabs:', e);
    }

    const cleanUrl = urlStr
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('?')[0]
      .replace(/\/$/, '');

    if (id === 'RECOPILAR') {
      return cleanUrl.includes('tiktok.com/search') || cleanUrl.includes('tiktok.com/live') || cleanUrl.includes('/search/live') || cleanUrl.includes('search');
    }
    if (id === 'DISPONIBILIDAD') {
      return cleanUrl.includes('relation') || cleanUrl.includes('relation-management') || cleanUrl.includes('portal/anchor/relation');
    }
    if (id === 'CONTACTAR') {
      return cleanUrl.includes('instant-messages') || cleanUrl.includes('messaging') || cleanUrl.includes('messages') || cleanUrl.includes('anchor/instant-messages');
    }

    return cleanUrl.includes(ROUTES[id as keyof typeof ROUTES]);
  };

  const handleToggleModal = async (id: ModalType) => {
    const isClosing = activeModal === id;
    const newActive = isClosing ? null : id;
    setActiveModal(newActive);
    // 1. Guardar en storage (como respaldo)
    await browser.storage.local.set({ activeOperationsModal: newActive });

    // 2. Mensajería Directa (Instantánea)
    try {
      const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.id) {
        await browser.tabs.sendMessage(tab.id, {
          type: 'FORCE_OPEN_MODAL',
          modal: newActive
        }).catch(() => { }); // Ignorar si la pestaña no tiene el script inyectado
      }
    } catch (e) {
      console.warn('Error sending direct message:', e);
    }

    // 3. Solo navegar para los modales de operación principales si NO estamos en la ruta correcta
    if (!isClosing && id && id in ROUTES) {
      const isOnCorrectRoute = await isCurrentRouteValid(id);
      if (isOnCorrectRoute) {
        console.log(`[Console] Ya se encuentra en la ruta correcta. No se requiere navegación.`);
        return;
      }

      let targetUrl = URLS[id as keyof typeof URLS];

      if (id === 'RECOPILAR' || id === 'HISTORY_RECOPILAR') {
        const res = await browser.storage.local.get(['keywords', 'activeKeyword']);
        const keywords = (res.keywords as string[]) || [];
        const activeKeyword = res.activeKeyword as string | undefined;
        const keywordToUse = activeKeyword || keywords[0] || 'batallas';
        targetUrl = `https://www.tiktok.com/search/live?q=${encodeURIComponent(keywordToUse)}`;
      }

      console.log(`[Console] Forzando navegación a ${targetUrl}`);
      await browser.runtime.sendMessage({ type: 'NAVIGATE', url: targetUrl });
    }
  };

  const buttons = [
    {
      id: 'RECOPILAR' as ModalType,
      historyId: 'HISTORY_RECOPILAR' as ModalType,
      title: 'Recopilar Leads',
      desc: 'Extrae usuarios del Live actual',
      icon: <ListPlus size={16} strokeWidth={2.5} />
    },
    {
      id: 'DISPONIBILIDAD' as ModalType,
      historyId: 'HISTORY_DISPONIBILIDAD' as ModalType,
      title: 'Comprobar Disponibilidad',
      desc: 'Verifica conexión online en lote',
      icon: <Search size={16} strokeWidth={2.5} />
    },
    {
      id: 'CONTACTAR' as ModalType,
      historyId: 'HISTORY_CONTACTAR' as ModalType,
      title: 'Contactar',
      desc: 'Envío de mensajes masivos',
      icon: <Send size={16} strokeWidth={2.5} />
    }
  ];

  return (
    <div
      className="flex flex-col h-full rounded-[20px] border border-black/5 dark:border-white/10 overflow-hidden shadow-sm animate-in fade-in relative"
      style={{
        background: 'var(--apple-bg)',
        minHeight: '400px'
      }}
    >

      {/* Header Info */}
      <div
        className="px-4 py-4 border-b border-black/5 dark:border-white/10"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Activity size={16} strokeWidth={2.5} className="text-[#007AFF]" />
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white tracking-tight">Operaciones</h2>
          </div>
          {/* Close Button fallback for better UX */}
          <button
            onClick={async () => {
              await browser.storage.local.set({ isOperationsConsoleOpen: false });
              await browser.storage.local.set({ activeOperationsModal: null });
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          Selecciona una secuencia para iniciar.
        </p>
      </div>

      {/* Control Center Items */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {buttons.map(btn => {
          const isActive = activeModal === btn.id;
          const isHistoryActive = activeModal === btn.historyId;

          const urlStr = window.location.href.toLowerCase();
          let isOnCorrectRoute = false;
          if (btn.id === 'RECOPILAR') {
            isOnCorrectRoute = urlStr.includes('tiktok.com/search') || urlStr.includes('tiktok.com/live') || urlStr.includes('/search/live') || urlStr.includes('search');
          } else if (btn.id === 'DISPONIBILIDAD') {
            isOnCorrectRoute = urlStr.includes('relation') || urlStr.includes('relation-management') || urlStr.includes('portal/anchor/relation');
          } else if (btn.id === 'CONTACTAR') {
            isOnCorrectRoute = urlStr.includes('instant-messages') || urlStr.includes('messaging') || urlStr.includes('messages') || urlStr.includes('anchor/instant-messages');
          }

          if (isActive) {
            console.info(`[OperationsConsole DEBUG] Modal Activo: ${btn.id}`);
            console.info(`[OperationsConsole DEBUG] URL Actual del matching: "${urlStr}"`);
            console.info(`[OperationsConsole DEBUG] ¿Está en la ruta correcta?: ${isOnCorrectRoute}`);
          }

          return (
            <div
              key={btn.id!}
              className={`flex flex-col rounded-[16px] border transition-all duration-300
                ${isActive || isHistoryActive
                  ? 'border-black/5 dark:border-white/10'
                  : 'border-transparent hover:bg-[#F5F5F7] dark:hover:bg-white/5'}`}
              style={{
                background: isActive || isHistoryActive ? 'var(--apple-bg-secondary)' : 'transparent'
              }}
            >
              <button
                onClick={() => handleToggleModal(btn.id)}
                title={`Abrir panel de ${btn.title}`}
                className="w-full flex items-center gap-3 p-3.5 text-left"
              >
                <div className="shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all
                    ${isActive
                      ? 'bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.4)]'
                      : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                  />
                </div>

                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-1.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-bold tracking-tight
                        ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {btn.title}
                      </span>
                    </div>
                    {/* Contadores cargados desde la API o Local Storage en tiempo real */}
                    <span className="text-[11px] font-bold bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                      {counts[btn.id as keyof typeof counts] ?? 0}
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium truncate
                    ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {btn.desc}
                  </span>
                </div>

                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${isActive
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white dark:bg-white/10 text-gray-400 border border-black/5 dark:border-white/5 shadow-sm'}`}>
                  {btn.icon}
                </div>
              </button>

              <div className="px-3.5 pb-3.5 pt-0 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleModal(btn.historyId);
                  }}
                  title={`Ver historial de ${btn.title}`}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-[10px] font-bold transition-all
                    ${isHistoryActive
                      ? 'bg-[#007AFF] text-white shadow-md'
                      : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400 border border-black/5 dark:border-white/5 hover:bg-gray-50'}`}
                >
                  <Eye size={12} />
                  <span>Historial</span>
                  {isHistoryActive && <div className="w-1 h-1 rounded-full bg-white animate-pulse" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
