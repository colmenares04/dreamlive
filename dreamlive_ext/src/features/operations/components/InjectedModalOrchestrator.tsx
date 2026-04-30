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

  // Tema persistente
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

  // Sync with extension storage for active modals
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
