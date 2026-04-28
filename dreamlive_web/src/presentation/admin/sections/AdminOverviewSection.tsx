import { StatCard, PageHeader, Button, Badge, Card } from '../../shared';
import type { AdminOverview } from '../../../core/entities';
import { TrendChart, TimeRangeSelector } from '../../dashboard/components/DashboardCharts';

interface AdminOverviewSectionProps {
  overview: AdminOverview | null;
  loading: boolean;
  onRefresh: (days?: number) => void;
  onPurge: () => void;
  days: number;
  onDaysChange: (days: number) => void;
}

export function AdminOverviewSection({ 
  overview, loading, onRefresh, onPurge, days, onDaysChange 
}: AdminOverviewSectionProps) {
  return (
    <section className="section active w-full flex flex-col gap-8 animate-fade-in pb-20">
      <PageHeader
        title="Vista General"
        subtitle="Monitoreo en tiempo real del ecosistema"
        actions={
          <div className="flex items-center gap-4">
            <TimeRangeSelector value={days} onChange={onDaysChange} />
            <Button variant="primary" onClick={() => onRefresh(days)} loading={loading}>
              <i className="fa-solid fa-rotate-right mr-2"></i> Actualizar
            </Button>
          </div>
        }
      />

      {/* Grid Principal Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Sesiones Activas"
          value={loading ? '-' : overview?.active_sessions ?? 0}
          icon={<i className="fa-solid fa-microchip text-indigo-600"></i>}
          iconBgClass="bg-indigo-100"
          subtext="Dispositivos online"
          accentColor="#6366f1"
        />
        <StatCard
          label="Agencias"
          value={loading ? '-' : overview?.active_agencies ?? 0}
          icon={<i className="fa-solid fa-building text-blue-600"></i>}
          iconBgClass="bg-blue-100"
          subtext="Organizaciones activas"
        />
        <StatCard
          label="Leads Disponibles"
          value={loading ? '-' : overview?.available_leads ?? 0}
          subtext="Listos para contactar"
          accentColor="#10b981"
          icon={<i className="fa-solid fa-users-viewfinder text-emerald-700"></i>}
          iconBgClass="bg-emerald-100"
        />
        <StatCard
          label="SLA de Soporte"
          value={loading ? '-' : (overview?.avg_ticket_sla ? `${overview.avg_ticket_sla}m` : '0m')}
          subtext="Tiempo prom. resolución"
          accentColor="#f59e0b"
          icon={<i className="fa-solid fa-headset text-amber-600"></i>}
          iconBgClass="bg-amber-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Tendencias */}
        <Card className="lg:col-span-2 p-8 shadow-2xl glass-card">
          <TrendChart 
            title="Evolución de Captación de Leads" 
            data={overview?.trends ?? []} 
            loading={loading}
          />
        </Card>

        {/* Audit Log Rápido */}
        <Card className="p-8 shadow-2xl glass-card">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6">
            Actividad Reciente
          </h3>
          <div className="space-y-6">
            {overview?.recent_activity.map((act, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="w-1.5 h-10 rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex-shrink-0">
                  <div className={`absolute inset-0 w-full rounded-full transition-all duration-500 scale-y-0 group-hover:scale-y-100 ${
                    act.category === 'SYSTEM_ERROR' ? 'bg-red-500' : 'bg-indigo-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[11px] font-black text-foreground uppercase truncate pr-2">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap font-medium">
                      {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium capitalize truncate">
                    {act.entity} • {act.category}
                  </div>
                </div>
              </div>
            ))}
            {(!overview?.recent_activity?.length && !loading) && (
              <p className="text-[10px] text-muted-foreground text-center py-10 italic">Sin actividad reciente</p>
            )}
          </div>
          <Button variant="outline" className="w-full mt-6 text-[10px] border-slate-100 dark:border-slate-800">
            Ver Auditoría Completa
          </Button>
        </Card>
      </div>

      <div className="mt-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">
          Métricas de Hoy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Contactados Hoy"
            value={loading ? '-' : overview?.today_contacted ?? 0}
            subtext="Mensajes enviados"
            accentColor="#3b82f6"
            icon={<i className="fa-solid fa-paper-plane text-blue-600"></i>}
            iconBgClass="bg-blue-100"
          />
          <StatCard
            label="Recopilados Hoy"
            value={loading ? '-' : overview?.today_collected ?? 0}
            subtext="Nuevos en DB"
            icon={<i className="fa-solid fa-magnet text-slate-600"></i>}
            iconBgClass="bg-slate-100"
          />
          <StatCard
            label="Pendientes/Antiguos"
            value={loading ? '-' : overview?.pending_collected ?? 0}
            subtext="Leads sin procesar"
            accentColor="#ef4444"
            icon={<i className="fa-solid fa-triangle-exclamation text-red-600"></i>}
            iconBgClass="bg-red-100"
          />
        </div>
      </div>

      {/* Database Actions */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mt-4">
        <h3 className="text-lg font-black text-foreground tracking-tight mb-4 uppercase">Acciones de Base de Datos</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-red-50 p-4 md:p-6 rounded-lg border border-red-200 gap-4">
          <div>
            <h4 className="text-red-900 font-bold mb-1">Purga de Usuarios Pendientes</h4>
            <p className="text-red-700 text-sm">Elimina todos los leads con estado 'recopilado' que no han sido procesados.</p>
          </div>
          <Button variant="danger" onClick={onPurge}>
            <i className="fa-solid fa-trash"></i> Ejecutar Purga
          </Button>
        </div>
      </div>
    </section>
  );
}
