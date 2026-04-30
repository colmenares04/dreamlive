import React, { useState, useEffect } from 'react';
import { ListPlus, Search, Send, Activity, AlertCircle, Eye } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { browser } from 'wxt/browser';

export type ModalType = 
  | 'RECOPILAR' 
  | 'DISPONIBILIDAD' 
  | 'CONTACTAR' 
  | 'HISTORY_RECOPILAR' 
  | 'HISTORY_DISPONIBILIDAD' 
  | 'HISTORY_CONTACTAR' 
  | null;

const ROUTES = {
  RECOPILAR: 'tiktok.com/live',
  DISPONIBILIDAD: 'live-backstage.tiktok.com',
  CONTACTAR: 'live-backstage.tiktok.com/instant-messages',
};

const URLS = {
  RECOPILAR: 'https://www.tiktok.com/live',
  DISPONIBILIDAD: 'https://live-backstage.tiktok.com/',
  CONTACTAR: 'https://live-backstage.tiktok.com/instant-messages',
};

export const OperationsConsole: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Función para actualizar la URL actual
  const updateCurrentUrl = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentUrl(tab.url);
      }
    } catch (e) {
      console.warn('Error querying tabs:', e);
    }
  };

  // Efecto para monitoreo dinámico (Loop de 5 segundos)
  useEffect(() => {
    updateCurrentUrl(); // Primera carga inmediata

    const interval = setInterval(() => {
      updateCurrentUrl();
    }, 5000);

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
    await browser.storage.local.set({ activeOperationsModal: newActive });
    
    // Solo navegar para los modales de operación principales
    if (!isClosing && id && id in ROUTES) {
      let targetUrl = URLS[id as keyof typeof URLS];
      
      // Si es RECOPILAR, intentamos ir a la palabra activa o a la primera de la lista
      if (id === 'RECOPILAR') {
        const res = await browser.storage.local.get(['keywords', 'activeKeyword']);
        const keywords = (res.keywords as string[]) || [];
        const activeKeyword = res.activeKeyword as string | undefined;
        const firstK = keywords[0] || 'batallas';
        
        // Prioridad: 1. Palabra activa, 2. Primera de la lista, 3. 'batallas'
        const keywordToUse = activeKeyword || firstK;
        targetUrl = `https://www.tiktok.com/search/live?q=${encodeURIComponent(keywordToUse)}`;
        
        // Aseguramos que haya algo marcado como activo
        if (!res.activeKeyword) {
          await browser.storage.local.set({ activeKeyword: keywordToUse });
        }
      }

      const targetRoute = ROUTES[id as keyof typeof ROUTES];
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab && !tab.url?.includes(targetRoute)) {
        await browser.tabs.update(tab.id, { url: targetUrl });
      }
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
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm animate-in fade-in relative">
      
      {/* Header Info */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} strokeWidth={2.5} className="text-[#007AFF]" />
          <h2 className="text-[14px] font-bold text-gray-900 dark:text-white tracking-tight">Operaciones</h2>
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
          const targetRoute = btn.id ? ROUTES[btn.id as keyof typeof ROUTES] : '';
          
          // Limpiamos la URL actual y la ruta objetivo para una comparación más precisa
          const cleanCurrentUrl = currentUrl.replace('https://', '').replace('http://', '').replace('www.', '');
          // Validación flexible para RECOPILAR (acepta /live y /search/live)
          let isOnCorrectRoute = cleanCurrentUrl.includes(targetRoute);
          if (btn.id === 'RECOPILAR' && cleanCurrentUrl.includes('tiktok.com') && cleanCurrentUrl.includes('/live')) {
            isOnCorrectRoute = true;
          }
          
          const showWarning = isActive && !isOnCorrectRoute;
          
          return (
            <div 
              key={btn.id!} 
              className={`flex flex-col rounded-[16px] border transition-all duration-300
                ${isActive || isHistoryActive
                  ? 'bg-[#F5F5F7] dark:bg-white/5 border-black/5 dark:border-white/10' 
                  : 'bg-transparent border-transparent hover:bg-[#F5F5F7] dark:hover:bg-white/5'}`}
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
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-bold tracking-tight
                      ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {btn.title}
                    </span>
                    {showWarning && <AlertCircle size={12} className="text-amber-500 animate-pulse" />}
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
