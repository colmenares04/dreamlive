import React from 'react';
import { StatCard, PageHeader, Button } from '../../shared';
import type { AgencyDashboard } from '../../../core/entities';

interface AgencyOverviewSectionProps {
  data: AgencyDashboard | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AgencyOverviewSection({ data, loading, onRefresh }: AgencyOverviewSectionProps) {
  return (
    <section className="animate-fade-in w-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <PageHeader
          title="Dashboard General"
          subtitle="Supervisión en tiempo real de toda la operación"
        />
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 w-full md:w-auto shadow-sm">
            <option value="all">🌍 Toda la Agencia</option>
          </select>
          <Button variant="outline" onClick={onRefresh} loading={loading}>
            <i className="fas fa-sync"></i>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Licencias Activas"
          value={loading ? '-' : data?.active_licenses ?? 0}
        />
        <StatCard
          label="Total Leads Capturados"
          value={loading ? '-' : data?.total_leads ?? 0}
        />
        <StatCard
          label="Contactados (Histórico)"
          value={loading ? '-' : data?.contacted_total ?? 0}
          accentColor="#4f46e5" /* Indigo primary color */
        />
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top palabras clave</div>
          <div className="flex flex-wrap gap-2 items-center">
            {loading ? (
              <span className="text-slate-400 text-sm">-</span>
            ) : data && data.top_keywords.length > 0 ? (
              data.top_keywords.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                  {kw}
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-sm">N/A</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Gráfico 1 - Placeholder por ahora */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-6">Tendencia de Contacto (7 Días)</h3>
          <div className="h-[250px] w-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-400 text-sm font-semibold">
            [Gráfico de barras Recharts en construcción]
          </div>
        </div>

        {/* Gráfico 2 - Placeholder + Stats secundarios */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Estado de la Base de Datos</h3>
          <div className="h-[180px] w-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-full mb-6 mx-auto" style={{ width: '180px' }}>
             <span className="text-slate-400 text-xs font-semibold px-4 text-center">[Gráfico Circular Recharts]</span>
          </div>
          
          <div className="mt-auto space-y-3">
            <div className="flex justify-between pb-3 border-b border-slate-100/50">
              <span className="font-semibold text-slate-500 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Disponibles
              </span>
              <strong className="text-slate-800">{loading ? '-' : data?.available_leads ?? 0}</strong>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div> Recopilados
              </span>
              <strong className="text-slate-800">{loading ? '-' : data?.collected_leads ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
