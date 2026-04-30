import { useEffect, useState, useRef } from "react";
import { useDraggable } from '../../shared/hooks/useDraggable';

// --- TIPOS ---
interface LogEntry {
  username: string;
  viewers: number;
  time: string;
  id: string;
  likes: number;
}

// --- ICONOS SVG ---
const Icons = {
  Eye: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Minimize: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Robot: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <circle cx="8" cy="16" r="0.5" fill="currentColor" />
      <circle cx="16" cy="16" r="0.5" fill="currentColor" />
    </svg>
  ),
  External: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
};

export const ActionPanel = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hook Draggable
  const { position, handleMouseDown, isDragging } = useDraggable({
    x: 24,
    y: 90,
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

  useEffect(() => {
    const handleNewLead = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { username, viewers, likes } = customEvent.detail;
      if (!username) return;

      setLogs((prevLogs) => {
        if (prevLogs.some((log) => log.username === username)) return prevLogs;
        return [
          ...prevLogs,
          {
            id: Math.random().toString(36).substr(2, 9),
            username,
            viewers: viewers || 0,
            likes: likes || 0,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ];
      });
    };

    const handleStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsVisible(customEvent.detail.active);
      if (customEvent.detail.active) setIsOpen(true);
    };

    document.addEventListener("dreamlive-new-lead", handleNewLead);
    document.addEventListener("dreamlive-status-change", handleStatusChange);

    return () => {
      document.removeEventListener("dreamlive-new-lead", handleNewLead);
      document.removeEventListener("dreamlive-status-change", handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current && !isHovered) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [logs, isHovered]);

  if (!isVisible) return null;

  // --- RENDER MINIMIZADO ---
  if (!isOpen) {
    return (
      <div
        onMouseDown={handleMouseDown}
        onClick={() => !isDragging && setIsOpen(true)}
        className={`fixed z-[2147483647] flex items-center gap-3 px-4 py-2 rounded-full border shadow-xl transition-all duration-200 cursor-pointer select-none
          ${isDragging ? "scale-105 opacity-90 cursor-grabbing shadow-2xl" : "hover:scale-105 active:scale-95"}
          ${isDarkMode 
            ? "bg-slate-900 border-indigo-500/30 text-white" 
            : "bg-white border-indigo-500/20 text-slate-800"}`}
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
        }}
      >
        <div className="relative flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        </div>
        <span className="text-sm font-black tracking-tight">DreamLive</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
          ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
          {logs.length}
        </span>
      </div>
    );
  }

  // --- RENDER EXPANDIDO ---
  return (
    <div
      className={`fixed z-[2147483647] w-[300px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 font-sans
        ${isDragging ? "scale-[1.02] cursor-grabbing shadow-slate-900/40" : "scale-100"}
        ${isDarkMode 
          ? "bg-slate-900/90 backdrop-blur-xl border-slate-800 text-slate-200" 
          : "bg-white/95 backdrop-blur-xl border-slate-200 text-slate-800"}`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      {/* HEADER */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-4 py-4 border-b cursor-grab active:cursor-grabbing select-none
          ${isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-100"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Icons.Robot />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-black tracking-tight leading-none">DreamLive</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Tracking Activo</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg transition-colors
              ${isDarkMode ? "hover:bg-slate-800 text-slate-500 hover:text-amber-400" : "hover:bg-slate-200 text-slate-400 hover:text-indigo-600"}`}
          >
            {isDarkMode ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M6.364 6.364l.707.707m11.728 11.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-colors
              ${isDarkMode ? "hover:bg-red-500/10 text-slate-600 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-500"}`}
          >
            <Icons.Minimize />
          </button>
        </div>
      </div>

      {/* LISTA DE REGISTROS */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`h-[300px] overflow-y-auto p-1 scrollbar-thin
          ${isDarkMode ? "bg-slate-900/50 scrollbar-thumb-slate-800" : "bg-white scrollbar-thumb-slate-200"}`}
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 py-10">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl animate-pulse">
              📡
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Esperando datos...</p>
              <p className="text-[11px] mt-1">Navega en TikTok Live para capturar leads</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {logs.map((log) => {
              const isLikes = log.likes && log.likes > 0;
              const accentColor = isLikes ? "text-rose-500 bg-rose-500/10 border-rose-500/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
              const formatNum = (n: number) => n > 1000 ? (n / 1000).toFixed(1) + "k" : n;

              return (
                <div
                  key={log.id}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border border-transparent transition-all hover:shadow-md
                    ${isDarkMode ? "hover:bg-slate-800 hover:border-slate-700" : "hover:bg-slate-50 hover:border-slate-100 shadow-sm"}`}
                >
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <a
                      href={`https://www.tiktok.com/@${log.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-[13px] font-bold flex items-center gap-1.5 truncate transition-colors
                        ${isDarkMode ? "text-slate-200 hover:text-indigo-400" : "text-slate-800 hover:text-indigo-600"}`}
                    >
                      @{log.username}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icons.External />
                      </span>
                    </a>
                    <span className="text-[10px] font-mono opacity-40">{log.time}</span>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-black
                    ${accentColor}`}>
                    {isLikes ? "❤️" : <Icons.Eye />}
                    <span>{formatNum(isLikes ? log.likes : log.viewers)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className={`px-4 py-2 flex justify-between items-center border-t text-[10px] font-black tracking-widest uppercase
        ${isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
        <span className="opacity-60">System Ready</span>
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span>v1.0.3</span>
        </div>
      </div>
    </div>
  );
};
