import { useEffect, useState, useRef } from "react";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { browser } from "wxt/browser";

// --- TIPOS ---
interface LogEntry {
  id: string; // Identificador único para keys de React
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export const BackstagePanel = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [wasOpenBeforeDrag, setWasOpenBeforeDrag] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Conectado");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hook Draggable
  const { position, handleMouseDown, isDragging } = useDraggable({
    x: 24,
    y: 24,
  });

  // --- LOGICA DE TEMA ---
  useEffect(() => {
    const savedTheme = localStorage.getItem("dreamlive-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
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

  // Auto-minimize on drag start, auto-maximize on drag end
  useEffect(() => {
    if (isDragging) {
      setWasOpenBeforeDrag(isOpen);
      if (isOpen) setIsOpen(false);
    } else if (wasOpenBeforeDrag && !isOpen) {
      setTimeout(() => setIsOpen(true), 100);
    }
  }, [isDragging]);

  // --- LOGICA DE EVENTOS ---
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const e = event as CustomEvent;
      const { type, message, data } = e.detail;

      if (type === "LOG") {
        setLogs((prev) => [
          ...prev.slice(-149),
          {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            message,
            type: data?.type || "info",
          },
        ]);
      }
      if (type === "STATUS") setStatus(data.status);
    };

    document.addEventListener("dreamlive-backstage-event", handleUpdate);
    return () => document.removeEventListener("dreamlive-backstage-event", handleUpdate);
  }, []);

  useEffect(() => {
    if (scrollRef.current && logs.length > 0) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  // Renderizado Minimizado (Píldora Flotante)
  if (!isOpen) {
    return (
      <div
        className={`fixed z-[2147483647] flex items-center gap-3 px-3 py-2 rounded-full border shadow-lg transition-all duration-200 cursor-pointer select-none
          ${isDragging ? "scale-105 shadow-xl opacity-90 cursor-grabbing" : "hover:scale-105 active:scale-95"}
          ${isDarkMode 
            ? "bg-slate-900 border-emerald-500/30 text-white" 
            : "bg-white border-emerald-500/20 text-slate-800"}`}
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
        }}
        onMouseDown={handleMouseDown}
        onClick={() => !isDragging && setIsOpen(true)}
      >
        <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/40">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M4 17L10 11L4 5M12 19H20" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-xs font-bold tracking-tight">DreamLive</span>
        {status && !status.includes("Esperando") && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        )}
      </div>
    );
  }

  // Renderizado Maximizado (Consola Moderna)
  return (
    <div
      className={`fixed z-[2147483647] w-[380px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-transform duration-200 font-sans
        ${isDragging ? "scale-[1.02] cursor-grabbing shadow-slate-900/40" : "scale-100"}
        ${isDarkMode 
          ? "bg-slate-950 border-slate-800 text-slate-200" 
          : "bg-white border-slate-200 text-slate-800"}`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {/* HEADER */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing select-none
          ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 17L10 11L4 5M12 19H20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-black tracking-widest uppercase opacity-90">Console</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full 
                ${status.toLowerCase().includes("esperando") 
                  ? "bg-slate-400" 
                  : "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"}`} 
              />
              <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">{status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-md transition-colors
              ${isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-amber-400" : "hover:bg-slate-200 text-slate-500 hover:text-indigo-600"}`}
            title="Cambiar Tema"
          >
            {isDarkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M6.364 6.364l.707.707m11.728 11.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-md transition-colors
              ${isDarkMode ? "hover:bg-red-500/10 text-slate-500 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-500"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* TERMINAL AREA */}
      <div 
        ref={scrollRef} 
        className={`h-[320px] overflow-y-auto p-4 font-mono text-[11px] leading-relaxed scrollbar-thin
          ${isDarkMode ? "bg-slate-950 scrollbar-thumb-slate-800" : "bg-white scrollbar-thumb-slate-200"}`}
      >
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale italic">
            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Esperando eventos...</span>
          </div>
        )}
        
        {logs.map((log) => {
          const colors = {
            success: "text-emerald-500",
            error: "text-red-500",
            warning: "text-amber-500",
            info: isDarkMode ? "text-slate-400" : "text-slate-500"
          };
          const prefix = { success: "✓", error: "✗", warning: "⚠", info: "›" };
          
          return (
            <div key={log.id} className="group flex gap-3 mb-1.5 hover:bg-slate-500/5 rounded transition-colors">
              <span className="shrink-0 opacity-40 tabular-nums select-none">{log.time}</span>
              <span className={`break-all ${colors[log.type]}`}>
                <span className="mr-2 font-bold opacity-80">{prefix[log.type]}</span>
                {log.message}
              </span>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className={`px-4 py-2 flex justify-between items-center border-t text-[10px] font-bold uppercase tracking-widest
        ${isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
        <span className="opacity-40">DreamLive System v1.0</span>
        <button
          onClick={() => setLogs([])}
          className={`px-2 py-1 rounded transition-all hover:scale-105 active:scale-95
            ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};
