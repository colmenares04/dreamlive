import { useState, useEffect } from "react";
import { licenseService, LicenseInfo } from "@/services/licenseService";
import { browser } from "wxt/browser";

export const Header = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dreamlive-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    const loadData = async () => {
      const data = await licenseService.getStoredLicense();
      setInfo(data);
    };
    loadData();

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local" && changes.savedLicense) {
        setInfo(changes.savedLicense.newValue || null);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("dreamlive-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dreamlive-theme", "light");
    }
  };

  return (
    <header className={`flex items-center justify-between p-3 rounded-2xl border shadow-sm transition-all duration-300 mb-4
      ${info 
        ? "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800" 
        : "bg-slate-50 border-slate-100 dark:bg-slate-950 dark:border-slate-900"}`}>
      
      <div className="flex items-center gap-3">
        <div className="relative group">
          <img
            src="/icon/48.png"
            alt="Logo"
            className="w-11 h-11 rounded-xl object-cover shadow-lg shadow-indigo-500/10 border border-slate-200 dark:border-slate-700 transition-transform group-hover:scale-105"
          />
          {info && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm" />
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-[14px] font-black tracking-tight text-slate-900 dark:text-white truncate max-w-[160px] leading-tight">
            {info?.agencyName || "DreamLive Agency"}
          </h1>
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
            {info ? (
              <>
                <span className="opacity-70">¡Hola, {info.recruiterName || "User"}!</span>
                <span className="text-indigo-500 dark:text-indigo-400">👋</span>
              </>
            ) : (
              <span className="text-rose-400 font-black uppercase tracking-tighter text-[9px]">Licencia Inactiva</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-all shadow-sm"
          title="Cambiar Tema"
        >
          {isDarkMode ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M6.364 6.364l.707.707m11.728 11.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-500 dark:hover:text-white transition-all shadow-sm active:scale-90"
          title="Configuración"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
