/**
 * AgencyDashboardView – Vista principal de la sección Agencia.
 * Muestra stats globales de la agencia + grid de cards por reclutador (agente).
 * Feature parity con PanelAdm.html → sección "dashboard".
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgencyData } from '../../agency/hooks/useAgencyData';
import { PageHeader, Button, Badge, Card } from '../../shared';
import { formatDate } from '../../../core/utils';
import { AgentDetailModal } from '../components/AgentDetailModal';
import { TrendChart, TimeRangeSelector, FunnelStat } from '../components/DashboardCharts';
import type { License } from '../../../core/entities';

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color = '' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{label}</p>
      <p className={`text-3xl font-black ${color || 'text-slate-800'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

// ─── Tarjeta de reclutador ────────────────────────────────────────────────────
function RecruiterCard({ license, onClick }: { license: License; onClick: () => void }) {
  const initial   = license.recruiter_name.charAt(0).toUpperCase();
  const isExpired = license.expires_at ? new Date(license.expires_at) < new Date() : false;
  const isActive  = license.status === 'active' && !isExpired;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-sm shadow-indigo-200">
          {initial}
        </div>
        <Badge variant={isActive ? 'green' : 'gray'}>
          {isActive ? 'Activa' : (isExpired ? 'Expirada' : 'Inactiva')}
        </Badge>
      </div>

      {/* Info */}
      <p className="font-bold text-slate-800">{license.recruiter_name}</p>
      <p className="font-mono text-xs text-indigo-600 mt-0.5">{license.key}</p>

      {/* Stats */}
      <div className="flex gap-4 mt-4 text-center">
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-semibold uppercase">Límite</p>
          <p className="font-bold text-indigo-600 text-lg">{license.request_limit}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-semibold uppercase">Ciclo</p>
          <p className="font-bold text-slate-700 text-lg">{license.refresh_minutes}m</p>
        </div>
      </div>

      {/* Expiry */}
      {license.expires_at && (
        <p className="text-[10px] text-slate-400 mt-3 text-right">
          <i className="fas fa-calendar-circle-minus mr-1" />
          Expira {formatDate(license.expires_at)}
        </p>
      )}
    </div>
  );
}

// ─── Vista principal ─────────────────────────────────────────────────────────
export function AgencyDashboardView() {
  const { 
    dashboard, loadingDash, teamLicenses, loadingTeam, 
    loadDashboard, loadTeam, days, setDays 
  } = useAgencyData();
  const navigate = useNavigate();

  // Pagination: 8 per page
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedAgent, setSelectedAgent] = React.useState<License | null>(null);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(teamLicenses.length / itemsPerPage);
  const paginatedAgents = teamLicenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <PageHeader
        title="Dashboard Agencia"
        subtitle="Supervisión en tiempo real de toda la operación"
        actions={
          <div className="flex items-center gap-4">
            <TimeRangeSelector value={days} onChange={setDays} />
            <Button variant="primary" onClick={() => loadDashboard(days)} id="btn-refresh-agency-dash">
              <i className="fas fa-sync text-xs mr-2" /> Actualizar
            </Button>
          </div>
        }
      />

      {/* Stats globales */}
      {loadingDash ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Licencias Activas"      value={dashboard?.active_licenses   ?? 0} color="text-indigo-600" />
          <StatCard label="Total Leads Capturados"  value={dashboard?.total_leads        ?? 0} />
          <StatCard label="Contactados (Histórico)" value={dashboard?.contacted_total    ?? 0} color="text-indigo-600" />
          <StatCard label="Leads Disponibles"       value={dashboard?.available_leads    ?? 0} color="text-emerald-600" />
        </div>
      )}

      {/* Secciones de Análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Tendencias */}
        <Card className="lg:col-span-2 p-8 shadow-2xl glass-card">
          <TrendChart 
            title="Captación de Prospectos" 
            data={dashboard?.trends ?? []} 
            loading={loadingDash}
            color="#6366f1"
          />
        </Card>

        {/* Embudo y Stats Secundarias */}
        <Card className="p-8 shadow-2xl glass-card flex flex-col justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
            Rendimiento del Embudo
          </h3>
          
          <div className="space-y-8">
            <FunnelStat 
              label="Tasa de Conversión" 
              value={dashboard?.conversion_rate ?? 0} 
            />
            
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Leads Pendientes</span>
                <Badge variant="yellow">{dashboard?.collected_leads ?? 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Contactados Hoy</span>
                <Badge variant="blue">{dashboard?.contacted_total ?? 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Licencias Disponibles</span>
                <Badge variant="green">{dashboard?.active_licenses ?? 0}</Badge>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full mt-8 text-[10px] border-slate-100 dark:border-slate-800 py-3"
            onClick={() => navigate('/settings/audit')}
          >
             Ver Detalles de Auditoría
          </Button>
        </Card>
      </div>

      {/* Top keywords */}
      {!loadingDash && dashboard?.top_keywords?.length ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-slate-500 mb-3">
            <i className="fas fa-tags mr-2 text-amber-500" />Top Palabras Clave
          </p>
          <div className="flex flex-wrap gap-2">
            {dashboard.top_keywords.map(kw => (
              <span key={kw} className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Grid de agentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-800">
            <i className="fas fa-users mr-2 text-indigo-500" />Monitoreo de Agentes
          </h3>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <i className="fas fa-chevron-left" />
              </Button>
              <span className="text-xs font-bold text-slate-500 px-2">
                {currentPage} / {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <i className="fas fa-chevron-right" />
              </Button>
            </div>
          )}
        </div>
        
        {loadingTeam ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : teamLicenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-100">
            <i className="fas fa-user-slash text-3xl mb-3 block" />
            <p>No hay reclutadores registrados aún.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginatedAgents.map(lic => (
                <RecruiterCard key={lic.id} license={lic} onClick={() => setSelectedAgent(lic)} />
              ))}
            </div>
          </>
        )}
      </div>
      
      <AgentDetailModal 
        license={selectedAgent} 
        open={selectedAgent !== null} 
        onClose={() => setSelectedAgent(null)} 
        onRefresh={() => { loadDashboard(); loadTeam(); }} 
      />
    </div>
  );
}
