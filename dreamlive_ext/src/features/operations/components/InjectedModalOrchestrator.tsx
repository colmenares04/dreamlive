import { useEffect, useState } from "react";
import { RecopilarModal } from "./modals/RecopilarModal";
import { AvailabilityModal } from "./modals/AvailabilityModal";
import { ContactModal } from "./modals/ContactModal";
import { HistoryModal } from "./modals/HistoryModal";
import { ControlCenterWidget } from "./ControlCenterWidget";
import { OperationsConsole } from "./OperationsConsole";
import { browser } from "wxt/browser";
import { ThemeProvider, useTheme } from "../../../shared/contexts/ThemeContext";

export type ModalType = 
  | 'RECOPILAR' 
  | 'DISPONIBILIDAD' 
  | 'CONTACTAR' 
  | 'HISTORY_RECOPILAR' 
  | 'HISTORY_DISPONIBILIDAD' 
  | 'HISTORY_CONTACTAR' 
  | null;

export const InjectedModalOrchestrator = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // --- 1. COMUNICACIÓN CON LA EXTENSIÓN (Mensajería en tiempo real) ---
  useEffect(() => {
    const messageListener = (message: any, sender: any, sendResponse: (res?: any) => void) => {
      console.log('📬 Mensaje recibido desde la extensión:', message);

      switch (message.type) {
        case 'PING_MODALS':
          sendResponse({ status: 'alive', activeModal });
          break;
        
        case 'FORCE_CLOSE_MODALS':
          handleCloseModal();
          sendResponse({ status: 'closed' });
          break;

        case 'FORCE_OPEN_MODAL':
          console.log('[Orchestrator] Forzando apertura de modal:', message.modal);
          setActiveModal(message.modal);
          sendResponse({ status: 'opened' });
          break;
      }
      return true;
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => browser.runtime.onMessage.removeListener(messageListener);
  }, [activeModal]);

  // --- 2. SINCRONIZACIÓN DE MODALES ACTIVOS (Storage) ---
  useEffect(() => {
    browser.storage.local.get('activeOperationsModal').then((res) => {
      if (res.activeOperationsModal) setActiveModal(res.activeOperationsModal as ModalType);
    });

    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes.activeOperationsModal) {
        const newValue = changes.activeOperationsModal.newValue as ModalType;
        console.log('[Orchestrator] Cambio detectado en activeOperationsModal:', newValue);
        setActiveModal(newValue);
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleCloseModal = () => {
    setActiveModal(null);
    browser.storage.local.set({ activeOperationsModal: null });
  };

  return (
    <ThemeProvider>
      <InjectedUIWrapper activeModal={activeModal} handleCloseModal={handleCloseModal} />
    </ThemeProvider>
  );
};

const InjectedUIWrapper = ({ activeModal, handleCloseModal }: { activeModal: ModalType, handleCloseModal: () => void }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Cargar estado inicial de la consola
  useEffect(() => {
    browser.storage.local.get('isOperationsConsoleOpen').then(res => {
      setIsConsoleOpen(!!res.isOperationsConsoleOpen);
    });

    const listener = (changes: any) => {
      if (changes.isOperationsConsoleOpen) {
        setIsConsoleOpen(!!changes.isOperationsConsoleOpen.newValue);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.addListener(listener);
  }, []);

  const toggleConsole = async () => {
    const newState = !isConsoleOpen;
    setIsConsoleOpen(newState);
    await browser.storage.local.set({ isOperationsConsoleOpen: newState });
  };

  return (
    <div className={`dreamlive-scope ${isDarkMode ? 'dark' : ''}`} data-theme={theme}>
      {/* Botón de control siempre visible */}
      <ControlCenterWidget isDarkMode={isDarkMode} onToggleConsole={toggleConsole} />

        {/* Panel de Operaciones Inyectado (Solo si está abierto y no hay modal activo) */}
        {isConsoleOpen && activeModal === null && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 2147483640,
            width: '320px',
            maxHeight: '80vh',
            pointerEvents: 'auto'
          }}>
            <OperationsConsole />
          </div>
        )}

        {/* Operaciones Principales */}
        {activeModal === 'RECOPILAR' && (
          <RecopilarModal onClose={handleCloseModal} isDarkMode={isDarkMode} />
        )}
        {activeModal === 'DISPONIBILIDAD' && (
          <AvailabilityModal onClose={handleCloseModal} isDarkMode={isDarkMode} />
        )}
        {activeModal === 'CONTACTAR' && (
          <ContactModal onClose={handleCloseModal} isDarkMode={isDarkMode} />
        )}

        {/* Historiales Específicos */}
        {(activeModal === 'HISTORY_RECOPILAR' || 
          activeModal === 'HISTORY_DISPONIBILIDAD' || 
          activeModal === 'HISTORY_CONTACTAR') && (
          <HistoryModal onClose={handleCloseModal} isDarkMode={isDarkMode} />
        )}
      </div>
  );
};
