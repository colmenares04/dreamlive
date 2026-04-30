import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Counter } from "@/components/ui/Counter";

interface Props {
  isContacting: boolean;
  onStart: () => void;
  onStopContact: () => void;
  onShowToday: () => void;
  onShowTotal: () => void;
  stats: any;
  resetTime: string | null;
}

export const ActivityCard = ({
  isContacting,
  onStart,
  onStopContact,
  onShowToday,
  onShowTotal,
  stats,
  resetTime,
}: Props) => (
  <Card title="Contactar y actividad" subtitle="Gestión de flujo de trabajo." fullWidth>
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          className="flex-[2] py-3 rounded-2xl shadow-lg"
          onClick={isContacting ? onStopContact : onStart}
          variant={isContacting ? "danger" : "primary"}
        >
          {isContacting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Detener Proceso
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5.147v13.706l11-6.853-11-6.853z" />
              </svg>
              Iniciar Contacto
            </>
          )}
        </Button>
        <Button 
          variant="outline"
          className="flex-1 py-3 rounded-2xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" 
          onClick={onShowToday}
        >
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase opacity-50">Hoy</span>
            <span className="text-[11px] font-black leading-none">Actividad</span>
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="col-span-2">
           <Counter
            label="Rendimiento 12h"
            count={stats.enviados12h}
            limit={stats.limitEnviados || 60}
          />
        </div>

        {resetTime && (
          <div className="col-span-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center justify-center animate-pulse gap-1">
            <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">
              Pausa de Seguridad
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                Reinicia en: {resetTime}
              </span>
            </div>
          </div>
        )}

        <div className="col-span-2">
          <Counter label="Total Contactados" count={stats.contactadosTotal} />
        </div>
      </div>

      <Button 
        variant="ghost" 
        className="w-full text-[10px] font-black uppercase tracking-widest py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500/50" 
        onClick={onShowTotal}
      >
        Historial Completo
      </Button>
    </div>
  </Card>
);
