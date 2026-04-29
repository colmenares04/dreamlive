import { Loader2 } from "lucide-react";

export const LoadingView = () => (
  <div className="w-[420px] h-[550px] bg-white dark:bg-slate-900 p-8 flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700">
    <div className="relative">
      <Loader2 size={48} className="text-indigo-600 dark:text-indigo-400 animate-spin" strokeWidth={2.5} />
      <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
    </div>
    
    <div className="text-center space-y-2">
      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase">Iniciando Sistema</h3>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
        Verificando Credenciales...
      </p>
    </div>

    <div className="absolute bottom-8 w-full px-12">
       <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 w-1/3 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
       </div>
    </div>
  </div>
);
