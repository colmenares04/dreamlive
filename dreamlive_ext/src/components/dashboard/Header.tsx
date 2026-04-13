import { useState, useEffect } from "react";
import { licenseService, LicenseInfo } from "@/services/licenseService";
import { browser } from "wxt/browser";

export const Header = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  const [info, setInfo] = useState<LicenseInfo | null>(null);

  useEffect(() => {
    // 1. Carga inicial
    const loadData = async () => {
      const data = await licenseService.getStoredLicense();
      setInfo(data);
    };
    loadData();

    // 2. Listener en tiempo real
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local" && changes.savedLicense) {
        console.log(
          "🔄 Header detectó cambio en licencia:",
          changes.savedLicense.newValue,
        );
        // Forzamos actualización del estado con la nueva data
        setInfo(changes.savedLicense.newValue || null);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <header className="flex items-center justify-between bg-card p-2.5 rounded-xl shadow-card mb-2.5 transition-all duration-300">
      <div className="flex items-center gap-2.5">
        <img
          src="/icon/48.png"
          alt="Logo"
          className="w-12 h-12 rounded-lg object-cover shadow-sm bg-gray-100"
        />

        <div className="flex flex-col">
          {/* NOMBRE DE LA AGENCIA */}
          <h1 className="text-[14px] font-bold tracking-wide text-text-main truncate max-w-[180px]">
            {info?.agencyName || "DreamLive"}
          </h1>

          {/* NOMBRE DEL RECLUTADOR */}
          <p className="text-[12px] text-text-soft flex items-center gap-1">
            {info ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                {/* Usamos un fallback por si recruiterName viene vacío */}
                ¡Hola, {info.recruiterName || "Reclutador"}! 👋
              </>
            ) : (
              "Sin licencia activa"
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold text-white shadow-sm ${info ? "bg-brand-gradient" : "bg-gray-400"}`}
        >
          {info ? "Pro" : "Free"}
        </span>

        <button
          onClick={onOpenSettings}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary hover:text-white transition-all text-lg active:scale-95"
          title="Configuración"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};
