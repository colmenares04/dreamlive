import { browser } from "wxt/browser";

interface CounterProps {
  label: string;
  count: number;
  limit?: number;
}

export const Counter = ({ label, count, limit }: CounterProps) => {
  const isLimitReached = label === "Enviados" && limit && count >= limit;

  if (isLimitReached) {
    browser.runtime.sendMessage({ type: "STOP_CONTACTING" });
  }

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300
      ${isLimitReached 
        ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse shadow-lg shadow-red-500/10" 
        : "bg-slate-50 border-slate-100 text-slate-800 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200"}`}>
      
      <span className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</span>
      
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black tabular-nums">{count}</span>
        {limit && (
          <span className="text-xs font-bold opacity-30">/ {limit}</span>
        )}
      </div>

      {isLimitReached && (
        <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter">Límite Alcanzado</span>
      )}
    </div>
  );
};
