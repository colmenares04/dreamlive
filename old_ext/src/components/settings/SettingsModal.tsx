import { useState, useEffect } from "react";
import { licenseService, LicenseInfo } from "@/services/licenseService";
import { TemplatesTab } from "./tabs/TemplatesTab";
import { UpdatesTab } from "./tabs/UpdatesTab";
import { LicenseTab } from "./tabs/LicenseTab";

import { FileText, RefreshCw, Key } from "lucide-react";

type TabType = "templates" | "updates" | "license";

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

  const handleLicenseChange = (newData: LicenseInfo | null) => {
    setLicenseData(newData);
    onLicenseUpdate();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "license", label: "LICENCIA", icon: Key },
    { id: "templates", label: "PLANTILLAS", icon: FileText },
    { id: "updates", label: "ACTUALIZAR", icon: RefreshCw },
  ] as const;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] border border-slate-200 dark:border-slate-800 scale-in-center animate-in zoom-in-95 duration-200">
        
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-56 bg-slate-50/50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-8">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Ajustes</h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Configuración Global</p>
          </div>

          <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group whitespace-nowrap
                    ${isActive
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10 border border-indigo-500/20"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                    }
                  `}
                >
                  <Icon size={16} className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 opacity-50 group-hover:opacity-100"}`} />
                  <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden md:block">
            <button
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all w-full"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-[11px] font-black uppercase tracking-widest">Cerrar</span>
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900/30 scrollbar-thin dark:scrollbar-thumb-slate-800">
          <div className="max-w-md mx-auto animate-in slide-in-from-right-4 duration-500">
             {activeTab === "templates" && <TemplatesTab />}
             {activeTab === "updates" && <UpdatesTab />}
             {activeTab === "license" && (
               <LicenseTab data={licenseData} onUpdate={handleLicenseChange} />
             )}
          </div>
        </div>

        {/* MOBILE CLOSE */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
