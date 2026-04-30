import { useEffect, useState } from "react";
import { RecopilarModal } from "./modals/RecopilarModal";
import { AvailabilityModal } from "./modals/AvailabilityModal";
import { ContactModal } from "./modals/ContactModal";
import { HistoryModal } from "./modals/HistoryModal";
import { ControlCenterWidget } from "./ControlCenterWidget";
import { browser } from "wxt/browser";

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- 1. COMUNICACIÓN CON LA EXTENSIÓN (Mensajería en tiempo real) ---
  useEffect(() => {
    const messageListener = (message: any, sender: any, sendResponse: (res?: any) => void) => {
      console.log('📬 Mensaje recibido desde la extensión:', message);

      switch (message.type) {
        case 'PING_MODALS':
          // La extensión pregunta si estamos vivos en esta página
          sendResponse({ status: 'alive', activeModal });
          break;
        
        case 'FORCE_CLOSE_MODALS':
          handleCloseModal();
          sendResponse({ status: 'closed' });
          break;

        case 'SYNC_THEME':
          setIsDarkMode(message.theme === 'dark');
          sendResponse({ status: 'synced' });
          break;
      }
      return true; // Mantiene el canal abierto para respuestas asíncronas
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => browser.runtime.onMessage.removeListener(messageListener);
  }, [activeModal]);

  // --- 2. SINCRONIZACIÓN DE TEMA (Storage) ---
  useEffect(() => {
    const syncTheme = async () => {
      const res = await browser.storage.local.get('theme');
      setIsDarkMode(res.theme === 'dark');
    };
    syncTheme();

    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes.theme) {
        setIsDarkMode(changes.theme.newValue === 'dark');
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // --- 3. SINCRONIZACIÓN DE MODALES ACTIVOS (Storage) ---
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

  const handleCloseModal = () => {
    setActiveModal(null);
    browser.storage.local.set({ activeOperationsModal: null });
  };

  return (
    <div className="dreamlive-scope" data-theme={isDarkMode ? "dark" : "light"}>
      {activeModal !== null && (
        <ControlCenterWidget isDarkMode={isDarkMode} />
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
