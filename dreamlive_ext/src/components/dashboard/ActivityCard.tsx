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
  <Card title="Contactar y actividad" subtitle="Gestión diaria." fullWidth>
    <div className="flex gap-1.5 mb-1.5">
      <Button
        className="flex-1"
        onClick={isContacting ? onStopContact : onStart}
        variant={isContacting ? "danger" : "primary"}
      >
        {isContacting ? "🛑 Detener" : "▶ Contactar"}
      </Button>
      <Button className="flex-1 text-[10px]" onClick={onShowToday}>
        Actividad Hoy
      </Button>
    </div>

    <div className="bg-gray-50/50 rounded-xl border border-gray-100 mb-2 overflow-hidden">
      <Counter
        label="Enviados"
        count={stats.enviados12h}
        limit={stats.limitEnviados || 60}
      />

      {resetTime && (
        <div className="mx-2 mb-2 px-2 py-1.5 bg-red-50 border border-red-100 rounded-md flex flex-col items-center justify-center animate-pulse gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-red-500 font-bold">
              ⛔ Límite alcanzado
            </span>
          </div>
          <span className="text-[10px] text-red-600 font-mono bg-white px-1.5 rounded border border-red-100 shadow-sm">
            Resetea en: {resetTime}
          </span>
        </div>
      )}

      <Counter label="Contactados" count={stats.contactadosTotal} />
    </div>
    <Button className="w-full" onClick={onShowTotal}>
      Ver Contactados Total
    </Button>
  </Card>
);
