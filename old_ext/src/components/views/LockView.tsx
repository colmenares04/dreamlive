import { Button } from "@/components/ui/Button";
import { Lock, ShieldAlert } from "lucide-react";

export const LockView = ({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-[500px] gap-8 p-10 animate-in fade-in zoom-in-95 duration-500 bg-white dark:bg-slate-900">
    <div className="relative group">
      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-400 dark:text-slate-500 rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-xl shadow-slate-200/20 dark:shadow-none border border-slate-50 dark:border-slate-700">
        <Lock size={40} />
      </div>
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30 animate-bounce">
         <ShieldAlert size={16} />
      </div>
    </div>
    
    <div className="text-center space-y-3">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Activación Pendiente</h2>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 max-w-[240px] mx-auto leading-relaxed uppercase tracking-widest">
        Desbloquea todo el potencial de tu agencia con una licencia válida.
      </p>
    </div>

    <div className="w-full space-y-4">
      <Button
        variant="primary"
        className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20"
        onClick={onOpenSettings}
      >
        Vincular Licencia
      </Button>
      
      <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] text-center">
        DreamLive Professional Edition
      </p>
    </div>
  </div>
);
