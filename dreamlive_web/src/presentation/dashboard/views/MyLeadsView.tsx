/**
 * GlobalLeadsView – Vista de Global Leads Database de la agencia.
 * Feature parity con PanelAdm.html → sección "leads":
 * - Búsqueda por username (debounced)
 * - Filtros por estado y reclutador
 * - Tabla con infinite scroll
 * - Exportar CSV
 * - Modal de limpieza (purge por tipo: recopilado / disponible / contactado / todo)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts';
import { useAgencyData } from '../../agency/hooks/useAgencyData';
import { PageHeader, Button, Badge, Modal } from '../../shared';
import { formatDate } from '../../../core/utils';
import type { LeadStatus } from '../../../core/entities';
import type { LeadFilters } from '../../agency/hooks/useAgencyData';

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { variant: 'green' | 'blue' | 'yellow' | 'gray'; icon: string }> = {
  contactado: { variant: 'blue',   icon: 'fa-check' },
  disponible: { variant: 'green',  icon: 'fa-circle-check' },
  recopilado: { variant: 'yellow', icon: 'fa-filter' },
  descartado: { variant: 'gray',   icon: 'fa-ban' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { variant: 'gray' as const, icon: 'fa-clock' };
  return (
    <Badge variant={meta.variant}>
      <i className={`fas ${meta.icon} text-[10px]`} />
      {status}
    </Badge>
  );
}

// ─── Purge modal ─────────────────────────────────────────────────────────────
interface PurgeModalProps {
  open: boolean;
  onClose: () => void;
  onPurge: (type: LeadStatus | 'all') => Promise<void>;
  licenses: { id: string; recruiter_name: string }[];
}

function PurgeModal({ open, onClose, onPurge }: PurgeModalProps) {
  const [busy, setBusy] = useState(false);

  const handle = async (type: LeadStatus | 'all') => {
    setBusy(true);
    await onPurge(type);
    setBusy(false);
    onClose();
  };

  const options: { type: LeadStatus | 'all'; icon: string; label: string; desc: string; color: string }[] = [
    { type: 'recopilado', icon: 'fa-filter',        label: 'Solo Recopilados',  desc: 'Sin procesar',            color: 'text-amber-500' },
    { type: 'disponible', icon: 'fa-circle-check',  label: 'Solo Disponibles',  desc: 'Listos para contactar',   color: 'text-emerald-500' },
    { type: 'contactado', icon: 'fa-paper-plane',   label: 'Solo Contactados',  desc: 'Mensajes enviados',       color: 'text-indigo-500' },
    { type: 'all',        icon: 'fa-bomb',           label: 'Eliminar TODO',     desc: 'Irreversible',            color: 'text-red-500' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Limpieza de Datos" size="md">
      <p className="text-xs text-slate-500 mb-5">Selecciona qué deseas eliminar de la agencia.</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map(o => (
          <button
            key={o.type}
            disabled={busy}
            onClick={() => handle(o.type)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900
              hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-center disabled:opacity-50 ${
                o.type === 'all' ? 'border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20' : ''
              }`}>
            <i className={`fas ${o.icon} text-xl ${o.color}`} />
            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{o.label}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{o.desc}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export function MyLeadsView() {
  const { user: currentUser } = useAuth();
  const {
    leads, leadsTotal, hasMore, loadingMore,
    filters,
    resetAndLoadLeads, loadMoreLeads,
    updateFilters, exportLeads, purgeLeads, deleteLead,
  } = useAgencyData();

  const bottomRef  = useRef<HTMLDivElement>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [search, setSearch] = useState(filters.search);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Cargar al montar
  useEffect(() => { 
    if (currentUser?.license_id) {
      updateFilters({ license_id: currentUser.license_id || 'all' });
    }
    resetAndLoadLeads(); 
  }, [currentUser, updateFilters, resetAndLoadLeads]); 

  // Debounced search
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => updateFilters({ search: val }), 500);
  }, [updateFilters]);

  // Infinite scroll observer
  useEffect(() => {
    if (!bottomRef.current) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMoreLeads(); },
      { threshold: 0.5 }
    );
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMoreLeads]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Panel de Leads"
        subtitle="Tus prospectos asignados"
        actions={
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setPurgeOpen(true)}>
              <i className="fas fa-trash-alt mr-1" />Limpiar Mis Leads
            </Button>
            <Button variant="success" onClick={exportLeads} id="btn-export-leads">
              <i className="fas fa-file-csv mr-1" />Exportar CSV
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm p-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>

        {/* Min Viewers */}
        <div className="relative w-32">
          <i className="fas fa-eye absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="number"
            value={filters.minViewers || ''}
            onChange={e => updateFilters({ minViewers: Number(e.target.value) })}
            placeholder="Min View"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>

        {/* Min Likes */}
        <div className="relative w-32">
          <i className="fas fa-heart absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 text-xs" />
          <input
            type="number"
            value={filters.minLikes || ''}
            onChange={e => updateFilters({ minLikes: Number(e.target.value) })}
            placeholder="Min Likes"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>

        {/* Estado */}
        <select
          value={filters.status}
          onChange={e => updateFilters({ status: e.target.value as LeadFilters['status'] })}
          className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white font-medium">
          <option value="all">Todos los Estados</option>
          <option value="disponible">🟢 Disponibles</option>
          <option value="contactado">🔵 Contactados</option>
          <option value="recopilado">🟡 Recopilados</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">
                <th className="px-6 py-4 text-left">Usuario / TikTok</th>
                <th className="px-6 py-4 text-center">Alcance (Viewers)</th>
                <th className="px-6 py-4 text-center">Impacto (Likes)</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-left">Capturado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {leads.length === 0 && !loadingMore ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <i className="fas fa-inbox text-3xl block mb-2" />
                    Sin resultados para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-white/5">
                      <td className="px-6 py-4">
                        <a
                          href={lead.username ? `https://www.tiktok.com/@${lead.username.replace('@', '')}` : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-black text-slate-800 dark:text-white hover:text-indigo-500 transition-colors flex items-center gap-2">
                          <i className="fab fa-tiktok text-xs opacity-20" />
                          <span>@{lead.username}</span>
                        </a>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                          <i className="fas fa-eye text-[10px] text-slate-400" />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">{(lead as any).viewer_count?.toLocaleString() || '0'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20">
                          <i className="fas fa-heart text-[10px] text-rose-500" />
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">{(lead as any).likes_count?.toLocaleString() || '0'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={lead.status} /></td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter bg-slate-50 dark:bg-white/5 py-1 px-2 rounded-lg">
                          {formatDate(lead.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteLead(lead.id)}
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300"
                          title="Descartar Lead"
                        >
                          <i className="fas fa-trash-alt text-xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con contador + sentinel infinite scroll */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Mostrando {leads.length} de {leadsTotal} leads
          </span>
          {loadingMore && (
            <span className="text-xs text-slate-400">
              <i className="fas fa-spinner fa-spin mr-1" />Cargando más...
            </span>
          )}
        </div>
        {/* Sentinel para infinite scroll */}
        <div ref={bottomRef} className="h-2" />
      </div>

      <PurgeModal
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        onPurge={type => purgeLeads(type, currentUser?.license_id || undefined)}
        licenses={[]}
      />
    </div>
  );
}
