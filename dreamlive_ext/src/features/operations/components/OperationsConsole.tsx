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
};

const URLS = {
  RECOPILAR: 'https://www.tiktok.com/search/live?q=live',
  DISPONIBILIDAD: 'https://live-backstage.tiktok.com/portal/anchor/relation',
  CONTACTAR: 'https://live-backstage.tiktok.com/portal/anchor/instant-messages',
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
    try {
      if (typeof browser.tabs === 'undefined' || !browser.tabs.query) {
        setCurrentUrl(window.location.href);
        return;
      }

      // 1. Intentar con query general para pestañas activas
      let tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await browser.tabs.query({ active: true, currentWindow: true });
      }
      if (tabs && tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
        return;
      }

      // 2. Si no funciona, buscar pestañas de tiktok o live-backstage
      const allTabs = await browser.tabs.query({});
      const activeTiktokTab = allTabs.find(t => 
        t.active && (t.url?.includes('tiktok.com') || t.url?.includes('live-backstage.tiktok.com'))
      );
      if (activeTiktokTab?.url) {
        setCurrentUrl(activeTiktokTab.url);
      }
    } catch (e) {
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

      // El badge de disponibilidad muestra cuántos leads están "recopilados" pendientes de ser comprobados.
      // El badge de contactar muestra cuántos leads están "disponibles" listos para enviar mensajes.
      const newCounts = {
        RECOPILAR: col,
        DISPONIBILIDAD: col,
        CONTACTAR: av,
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

  // Efecto para monitoreo dinámico (Loop de 6 segundos)
  useEffect(() => {
    updateCurrentUrl(); // Primera carga inmediata
    fetchMetrics(); // Primer fetch inmediato

    const interval = setInterval(() => {
      updateCurrentUrl();
      fetchMetrics();
    }, 6000);

    return () => clearInterval(interval);
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
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

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
        }).catch(() => {}); // Ignorar si la pestaña no tiene el script inyectado
      }
    } catch (e) {
      console.warn('Error sending direct message:', e);
    }

    // 3. Solo navegar para los modales de operación principales
    if (!isClosing && id && id in ROUTES) {
      let targetUrl = URLS[id as keyof typeof URLS];
      
      if (id === 'RECOPILAR') {
        const res = await browser.storage.local.get(['keywords', 'activeKeyword']);
        const keywords = (res.keywords as string[]) || [];
        const activeKeyword = res.activeKeyword as string | undefined;
        const keywordToUse = activeKeyword || keywords[0] || 'batallas';
        targetUrl = `https://www.tiktok.com/search/live?q=${encodeURIComponent(keywordToUse)}`;
      }

      console.log(`[Console] Forzando navegación a ${targetUrl}`);
      await browser.runtime.sendMessage({ type: 'NAVIGATE', url: targetUrl });

      // Verificación inteligente: Loop de 5 intentos cada 2 segundos.
      // Si tras 5 intentos no se llega a la ruta correcta, se desactiva el modal.
      let attempts = 0;
      const maxAttempts = 5;

      const checkInterval = setInterval(async () => {
        attempts++;

        let currentUrlStr = '';
        try {
          let tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
          if (!tabs || tabs.length === 0) {
            tabs = await browser.tabs.query({ active: true, currentWindow: true });
          }
          if (tabs && tabs[0]?.url) {
            currentUrlStr = tabs[0].url.toLowerCase();
          } else {
            const allTabs = await browser.tabs.query({});
            const activeTiktokTab = allTabs.find(t => 
              t.active && (t.url?.includes('tiktok.com') || t.url?.includes('live-backstage.tiktok.com'))
            );
            if (activeTiktokTab?.url) {
              currentUrlStr = activeTiktokTab.url.toLowerCase();
            }
          }
        } catch (err) {
          console.warn('Error querying tab during navigation check:', err);
        }

        let isOnCorrectRoute = false;
        if (id === 'RECOPILAR') {
          isOnCorrectRoute = currentUrlStr.includes('tiktok.com/search') || currentUrlStr.includes('tiktok.com/live') || currentUrlStr.includes('/search/live');
        } else if (id === 'DISPONIBILIDAD') {
          isOnCorrectRoute = currentUrlStr.includes('relation') || currentUrlStr.includes('relation-management') || currentUrlStr.includes('portal/anchor/relation');
        } else if (id === 'CONTACTAR') {
          isOnCorrectRoute = currentUrlStr.includes('instant-messages') || currentUrlStr.includes('messaging') || currentUrlStr.includes('messages') || currentUrlStr.includes('anchor/instant-messages');
        }

        console.log(`[Console Route Retry] Intento ${attempts}: id=${id}, currentUrlStr="${currentUrlStr}", isOnCorrectRoute=${isOnCorrectRoute}`);

        if (isOnCorrectRoute) {
          console.log(`[Console] ¡Ruta correcta detectada en intento ${attempts}!`);
          clearInterval(checkInterval);
          return;
        }

        if (attempts >= maxAttempts) {
          console.warn(`[Console] No se detectó la ruta correcta después de ${maxAttempts} intentos. Desactivando modal.`);
          clearInterval(checkInterval);
          setActiveModal(null);
          await browser.storage.local.set({ activeOperationsModal: null });
        }
      }, 2000);
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
      className="flex flex-col h-full rounded-xl border overflow-hidden shadow-sm animate-in fade-in relative"
      style={{ 
        background: 'var(--apple-bg)', 
        borderColor: 'var(--apple-border)',
        minHeight: '400px'
      }}
    >
      
      {/* Header Info */}
      <div 
        className="px-4 py-4 border-b"
        style={{ borderColor: 'var(--apple-border)' }}
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
          
          const urlStr = currentUrl.toLowerCase();
          let isOnCorrectRoute = false;
          if (btn.id === 'RECOPILAR') {
            isOnCorrectRoute = urlStr.includes('tiktok.com/search') || urlStr.includes('tiktok.com/live') || urlStr.includes('/search/live');
          } else if (btn.id === 'DISPONIBILIDAD') {
            isOnCorrectRoute = urlStr.includes('relation') || urlStr.includes('relation-management') || urlStr.includes('portal/anchor/relation');
          } else if (btn.id === 'CONTACTAR') {
            isOnCorrectRoute = urlStr.includes('instant-messages') || urlStr.includes('messaging') || urlStr.includes('messages') || urlStr.includes('anchor/instant-messages');
          }
          
          if (isActive) {
            console.log(`[Console UI Match] btn.id=${btn.id}, urlStr="${urlStr}", isOnCorrectRoute=${isOnCorrectRoute}`);
          }
          
          const showWarning = isActive && !isOnCorrectRoute;
          
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
                className="w-full flex items-center gap-3 p-3.5 text-left"
              >
                <div className="shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all
                    ${isActive 
                      ? showWarning ? 'bg-amber-500' : 'bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.4)]' 
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
                      {showWarning && <AlertCircle size={12} className="text-amber-500 animate-pulse" />}
                    </div>
                    {/* Contadores cargados desde la API o Local Storage en tiempo real */}
                    <span className="text-[11px] font-bold bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                      {counts[btn.id as keyof typeof counts] ?? 0}
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium truncate
                    ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {showWarning ? 'Ruta incorrecta' : btn.desc}
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
