import { useState, useEffect } from "react";
import { licenseService, LicenseInfo } from "@/services/licenseService";
import { TemplatesTab } from "./tabs/TemplatesTab";
import { UpdatesTab } from "./tabs/UpdatesTab";
import { LicenseTab } from "./tabs/LicenseTab";
import { AdvancedTab } from "./tabs/AdvancedTab";
import { FileText, RefreshCw, Key, Settings } from "lucide-react";

type TabType = "templates" | "updates" | "license" | "advanced";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseUpdate: () => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  onLicenseUpdate,
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("license");
  const [licenseData, setLicenseData] = useState<LicenseInfo | null>(null);

  // Cargar licencia y escuchar cambios
  useEffect(() => {
    if (isOpen) {
      licenseService.getStoredLicense().then((data) => {
        setLicenseData(data || null);
      });

      const handleStorageChange = (changes: any, areaName: string) => {
        if (areaName === "local" && changes.savedLicense) {
          setLicenseData(changes.savedLicense.newValue || null);
        }
      };

      import("wxt/browser").then(({ browser }) => {
        browser.storage.onChanged.addListener(handleStorageChange);
      });

      return () => {
        import("wxt/browser").then(({ browser }) => {
          browser.storage.onChanged.removeListener(handleStorageChange);
        });
      };
    }
  }, [isOpen]);

  // Wrapper para actualizar estado local Y avisar a la App al mismo tiempo
  const handleLicenseChange = (newData: LicenseInfo | null) => {
    setLicenseData(newData);
    onLicenseUpdate(); // ⚡ ¡Esto dispara el refresco inmediato en App.tsx!
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "templates", label: "PLANTILLAS", icon: FileText },
    { id: "updates", label: "ACTUALIZACIONES", icon: RefreshCw },
    { id: "license", label: "LICENCIA", icon: Key },
    { id: "advanced", label: "AVANZADO", icon: Settings },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans text-text-main">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-[100%] max-w-[520px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* --- HEADER TABS --- */}
        <div className="flex flex-wrap items-end gap-1 px-3 pt-3 sm:px-4 sm:pt-4 border-b border-border bg-white">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-2.5 sm:px-3 py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight transition-all flex items-center gap-1.5
                  ${isActive
                    ? "bg-white text-accent border border-border border-b-white rounded-t-lg -mb-[1px] z-10 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]"
                    : "bg-primary text-gray-300 hover:bg-primary-hover rounded-lg mb-1 shadow-sm opacity-90 hover:opacity-100"
                  }
                `}
              >
                <Icon size={12} strokeWidth={2.5} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* --- CONTENT AREA (Renderizado Condicional) --- */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          {activeTab === "templates" && <TemplatesTab />}
          {activeTab === "updates" && <UpdatesTab />}
          {activeTab === "license" && (
            <LicenseTab data={licenseData} onUpdate={handleLicenseChange} />
          )}
          {activeTab === "advanced" && <AdvancedTab />}
        </div>
      </div>
    </div>
  );
};
