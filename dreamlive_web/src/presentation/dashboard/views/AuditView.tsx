/**
 * AuditView – Vista de Auditoría (solo superuser).
 * Muestra el log de auditoría con filtros por categoría, agencia y búsqueda.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader, Button, Badge } from '../../shared';
import { AuditAdapter } from '../../../services';
import { useNotifications } from '../../../contexts';
import type { AuditLog } from '../../../core/entities/settings';

const CATEGORY_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  auth:    'blue',
  license: 'green',
  agency:  'yellow',
  user:    'gray',
  lead:    'gray',
};

export function AuditView() {
  const { error } = useNotifications();
  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('');
  const [agencyId, setAgencyId]     = useState('');
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await AuditAdapter.list({
        category: category || undefined,
        agency_id: agencyId || undefined,
        limit: 200,
      }));
    } catch { error('Error cargando auditoría.'); }
    finally { setLoading(false); }
  }, [category, agencyId]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.category.toLowerCase().includes(search.toLowerCase()) ||
        l.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.user_id?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const categories = Array.from(new Set(logs.map(l => l.category)));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Auditoría del Sistema"
        subtitle="Registro completo de acciones y eventos críticos"
        actions={
          <Button variant="outline" onClick={load} id="btn-refresh-audit">
            <i className="fas fa-sync text-sm" />
          </Button>
        }
      />

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm p-4 flex flex-wrap gap-3 items-center glass-card">
        <div className="relative flex-1 min-w-48">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar acción, categoría, entidad…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-400 transition-colors focus:outline-none dark:text-white"
          />
        </div>
        <select
          value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 focus:outline-none dark:text-white min-w-32"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          value={agencyId} onChange={e => setAgencyId(e.target.value)}
          placeholder="Agency ID…"
          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-400 dark:text-white w-52"
        />
        <span className="text-xs text-slate-400 ml-auto font-semibold">
          {filtered.length} registros
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <i className="fas fa-spinner fa-spin mr-2" /> Cargando auditoría...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <i className="fas fa-clipboard-list text-4xl block mb-3" />
          No hay registros de auditoría.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden glass-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 text-left w-36">Fecha/Hora</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Acción</th>
                <th className="px-5 py-3 text-left">Entidad</th>
                <th className="px-5 py-3 text-left">Usuario</th>
                <th className="px-5 py-3 text-left">IP</th>
                <th className="px-5 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={CATEGORY_COLORS[log.category] ?? 'gray'}>
                        {log.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{log.action}</td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {log.entity_name ? (
                        <span>{log.entity_name} <span className="text-slate-300 dark:text-slate-600">#{log.entity_id?.substring(0, 8)}</span></span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                        {log.user_id?.substring(0, 12) ?? 'sistema'}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500">{log.ip_address ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {(log.old_data || log.new_data) && (
                        <Button size="sm" variant="outline"
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          className="dark:border-white/10 dark:hover:bg-white/5">
                          <i className={`fas fa-chevron-${expanded === log.id ? 'up' : 'down'} text-xs`} />
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-slate-50 dark:bg-black/20">
                      <td colSpan={7} className="px-5 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {log.old_data && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Antes</p>
                              <pre className="text-[11px] bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-lg p-3 overflow-auto max-h-32 text-red-700 dark:text-red-400">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Después</p>
                              <pre className="text-[11px] bg-green-50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/20 rounded-lg p-3 overflow-auto max-h-32 text-green-700 dark:text-green-400">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
