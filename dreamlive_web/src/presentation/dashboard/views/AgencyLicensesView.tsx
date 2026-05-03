/**
 * AgencyLicensesView.tsx
 * 
 * REDISEÑO PREMIUM + SELECTOR DE AGENCIA PARA SUPERUSER
 * Versión analítica de la gestión de licencias.
 * Permite a los administradores globales "vincularse" a cualquier agencia para ver sus datos.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminData } from '../../admin/hooks/useAdminData';
import { useNotifications, useAuth } from '../../../contexts';
import { PageHeader, Badge, DataTable, Button } from '../../shared';
import clsx from 'clsx';
import type { License } from '../../../core/entities';

function licenseStatus(lic: License): 'active' | 'expired' | 'inactive' {
  if (!lic.expires_at) return lic.status === 'active' ? 'active' : 'inactive';
  if (new Date(lic.expires_at) < new Date()) return 'expired';
  return lic.status === 'active' ? 'active' : 'inactive';
}

function StatusBadge({ lic }: { lic: License }) {
  const s = licenseStatus(lic);
  const map: Record<string, { variant: 'green' | 'red' | 'yellow' | 'gray'; label: string }> = {
    active:   { variant: 'green',  label: 'ACTIVA' },
    expired:  { variant: 'yellow', label: 'EXPIRADA' },
    inactive: { variant: 'gray',   label: 'INACTIVA' },
  };
  const { variant, label } = map[s];
  return <Badge variant={variant}>{label}</Badge>;
}

type TabFilter = 'all' | 'active' | 'inactive';

export function AgencyLicensesView() {
  const { 
    licenses, loadingDeps, metrics, agencies, 
    loadDeps, loadMetrics 
  } = useAdminData();
  const { role: rawRole } = useAuth();
  const role = rawRole?.toLowerCase();
  const { success } = useNotifications();

  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');

  // Efecto para recargar cuando cambia la agencia elegida
  useEffect(() => {
    loadDeps(selectedAgencyId || undefined);
    loadMetrics(selectedAgencyId || undefined);
    if (selectedAgencyId) {
      const agencyName = agencies.find(a => a.id === selectedAgencyId)?.name;
      success(`Visualizando datos de: ${agencyName || 'Agencia'}`);
    }
  }, [selectedAgencyId]); // eslint-disable-line

  const stats = useMemo(() => {
    const activeArr = licenses.filter(l => licenseStatus(l) === 'active');
    const today  = licenses.reduce((acc, l) => acc + (l.today_leads || 0), 0);
    const total  = licenses.reduce((acc, l) => acc + (l.total_leads || 0), 0);
    
    // Sesiones basadas en el pulso (last_ping < 2 min)
    const sessions = Object.values(metrics).filter(m => {
      if (!m.last_ping) return false;
      const ping = new Date(m.last_ping);
      return (new Date().getTime() - ping.getTime()) < 120000;
    }).length;

    return { active: activeArr.length, today, total, sessions };
  }, [licenses, metrics]);

  const ranking = useMemo(() => {
    return [...licenses]
      .filter(l => (l.today_leads || 0) > 0)
      .sort((a, b) => (b.today_leads || 0) - (a.today_leads || 0))
      .slice(0, 5);
  }, [licenses]);

  const filtered = useMemo(() => {
    let result = licenses;
    if (tab === 'active')   result = result.filter(l => licenseStatus(l) === 'active');
    else if (tab === 'inactive') result = result.filter(l => licenseStatus(l) !== 'active');
    
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => 
        l.key.toLowerCase().includes(q) || 
        l.recruiter_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [licenses, tab, search]);

  const columns = [
    {
      key: 'key' as const,
      header: 'Identificador / Reclutador',
      render: (l: License) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs shadow-sm">ID</div>
          <div>
            <p className="font-mono font-black text-indigo-500 text-sm tracking-tight leading-none mb-1 uppercase">{l.key}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l.recruiter_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status' as const,
      header: 'Estado / Pulso',
      render: (l: License) => {
        const isOnline = l.last_ping && (new Date().getTime() - new Date(l.last_ping).getTime()) < 120000;
        return (
          <div className="space-y-2">
            <StatusBadge lic={l} />
            <div className="flex items-center gap-1.5 ml-1">
              <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse shadow-sm", isOnline ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-300")} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">{isOnline ? 'En Línea' : 'Desconectado'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'today_leads' as const,
      header: 'Producción Hoy',
      render: (l: License) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${Math.min(100, (l.today_leads || 0) * 2)}%` }} />
          </div>
          <span className="text-sm font-black text-slate-700 dark:text-white tabular-nums">{l.today_leads || 0}</span>
        </div>
      ),
    },
    {
      key: 'total_leads' as const,
      header: 'Acumulado',
      render: (l: License) => (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">
          <i className="fas fa-chart-line text-[10px] text-slate-400" />
          <span className="text-xs font-black text-slate-600 dark:text-slate-400 tabular-nums">{l.total_leads?.toLocaleString() || 0}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in p-2">
      <PageHeader 
        title="Auditoría Analítica" 
        subtitle="Supervisa el rendimiento en tiempo real y métricas de producción de cualquier agencia."
        actions={
          <div className="flex items-center gap-3">
            {role === 'superuser' && (
              <div className="relative group">
                <i className="fas fa-building absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-xs" />
                <select 
                  value={selectedAgencyId} 
                  onChange={e => setSelectedAgencyId(e.target.value)} 
                  className="pl-11 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer min-w-[200px]"
                >
                  <option value="">TODAS LAS AGENCIAS</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>)}
                </select>
                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
              </div>
            )}
            <Button variant="outline" size="sm" className="!rounded-2xl h-[44px] w-[44px] !p-0" onClick={() => { loadDeps(selectedAgencyId); loadMetrics(selectedAgencyId); }}>
               <i className="fas fa-sync-alt" />
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Agentes Activos', value: stats.active, icon: 'fa-id-badge', color: 'indigo', gloss: 'from-indigo-500 to-blue-500' },
          { label: 'Sesiones En Vivo', value: stats.sessions, icon: 'fa-bolt', color: 'emerald', gloss: 'from-emerald-500 to-teal-400', pulse: true },
          { label: 'Producción Hoy', value: stats.today, icon: 'fa-fire', color: 'orange', gloss: 'from-orange-500 to-amber-400' },
          { label: 'Leads Totales', value: stats.total, icon: 'fa-database', color: 'blue', gloss: 'from-blue-600 to-sky-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-transform shadow-sm">
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${s.gloss} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700`} />
            <div className="relative flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gloss} flex items-center justify-center text-white text-xl shadow-lg shadow-${s.color}-500/20`}>
                <i className={`fas ${s.icon} ${s.pulse ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{s.label}</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white leading-none tabular-nums">{s.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-6 overflow-x-auto scroller-hidden">
                {['all', 'active', 'inactive'].map(k => (
                  <button key={k} onClick={() => setTab(k as any)} className={clsx("pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all pt-2", tab === k ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}>
                    {k === 'all' ? 'Todas' : k === 'active' ? 'Activas' : 'Exp / Inact'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por ID o Agente..." className="pl-11 pr-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full sm:w-64 shadow-sm" />
              </div>
            </div>
            <div className="p-2">
              <DataTable columns={columns} data={filtered} loading={loadingDeps} keyExtractor={l => l.id} variant="ghost" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-lg shadow-indigo-500/5 h-fit lg:sticky lg:top-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 text-white relative">
            <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none">Elite Reclutadores</h3>
            <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mt-2">{selectedAgencyId ? 'Producción Agencia' : 'Producción Global'} Hoy</p>
            <i className="fas fa-award absolute top-8 right-8 text-4xl text-white/10" />
          </div>
          <div className="p-4 space-y-3">
            {ranking.map((l, i) => (
              <div key={l.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-slate-800/10 hover:border-indigo-200 transition-all group">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm", 
                  i === 0 ? "bg-amber-400 text-amber-900" : 
                  i === 1 ? "bg-slate-200 text-slate-600" : 
                  i === 2 ? "bg-orange-200 text-orange-800" : 
                  "bg-slate-50 text-slate-400")}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none mb-1 truncate">{l.recruiter_name}</p>
                  <p className="text-[9px] font-black text-slate-400 leading-none font-mono">{l.key}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-black text-indigo-500 tabular-nums">{l.today_leads}</p>
                   <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">LEADS</p>
                </div>
              </div>
            ))}
            {ranking.length === 0 && (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                 <i className="fas fa-ghost text-2xl opacity-20" />
                 <p className="italic text-xs font-bold uppercase tracking-widest">Sin actividad hoy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
