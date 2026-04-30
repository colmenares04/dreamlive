/**
 * LicensesView.tsx
 * 
 * PANEL DE CONTROL TOTAL (ADMIN)
 * Rediseñado siguiendo los lineamientos de AdminUP.html.
 * Incluye Auditoría, Edición Manual de Fechas y Eliminación Segura.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAdminData } from '../../admin/hooks/useAdminData';
import { PageHeader, Badge, Button, DataTable, Modal } from '../../shared';
import { AuditAdapter } from '../../../services';
import { formatDate } from '../../../core/utils';
import clsx from 'clsx';
import type { Agency, License } from '../../../core/entities';
import type { AuditLog } from '../../../core/entities/settings';

/**
 * Determina el estado lógico de una licencia.
 */
function licenseStatus(lic: License): 'active' | 'expired' | 'inactive' {
  if (!lic.expires_at) return lic.status === 'active' ? 'active' : 'inactive';
  if (new Date(lic.expires_at) < new Date()) return 'expired';
  return lic.status === 'active' ? 'active' : 'inactive';
}

/**
 * Badge de estado.
 */
function StatusBadge({ lic }: { lic: License }) {
  const s = licenseStatus(lic);
  const map: Record<string, { variant: 'green' | 'red' | 'yellow' | 'gray'; label: string }> = {
    active: { variant: 'green', label: 'ACTIVA' },
    expired: { variant: 'yellow', label: 'EXPIRADA' },
    inactive: { variant: 'gray', label: 'INACTIVA' },
  };
  const { variant, label } = map[s];
  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * CreateLicenseForm (Modal auxiliar)
 */
function CreateLicenseForm({ agencies, onCreate, onSuccess }: {
  agencies: Agency[];
  onCreate: (p: any) => Promise<void>;
  onSuccess: () => void;
}) {
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? '');
  const [recruiter, setRecruiter] = useState('');
  const [duration, setDuration] = useState('30');
  const [customDays, setCustomDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const days = duration === 'custom' ? customDays : parseInt(duration);

  const handleSubmit = async () => {
    if (!agencyId || !recruiter.trim()) return;
    setLoading(true);
    try {
      await onCreate({ agency_id: agencyId, recruiter_name: recruiter, days });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Agencia Destino</label>
          <select value={agencyId} onChange={e => setAgencyId(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombre del Reclutador</label>
          <input type="text" value={recruiter} onChange={e => setRecruiter(e.target.value)} placeholder="Ej: Agente Regional" className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Vigencia Inicial</label>
        <div className="flex gap-4">
          {['30', '90', 'custom'].map(opt => (
            <button key={opt} onClick={() => setDuration(opt)} className={clsx("flex-1 px-4 py-3 rounded-2xl border text-sm font-bold transition-all", duration === opt ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-400")}>
              {opt === 'custom' ? 'Manual' : `${opt} Días`}
            </button>
          ))}
        </div>
        {duration === 'custom' && (
          <input
            type="number"
            value={isNaN(customDays) ? '' : customDays}
            onChange={e => setCustomDays(parseInt(e.target.value) || 0)}
            className="mt-4 w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 outline-none dark:text-white"
          />
        )}
      </div>
      <Button variant="primary" loading={loading} onClick={handleSubmit} full className="py-4">Generar Nueva Licencia</Button>
    </div>
  );
}

/**
 * AuditLicenseModal - Modal LG con historial
 */
function AuditLicenseModal({ license, open, onClose }: { license: License | null; open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && license) {
      setLoading(true);
      AuditAdapter.list({ agency_id: license.agency_id || undefined, limit: 100 })
        .then(data => {
          // Filtrar por entity_id si está disponible
          setLogs(data.filter(l => l.entity_id === license.id || l.action.includes(license.key)));
        })
        .finally(() => setLoading(false));
    }
  }, [open, license]);

  return (
    <Modal open={open} onClose={onClose} title={`Historial de Auditoría: ${license?.key}`} size="lg">
      <div className="max-h-[60vh] overflow-auto">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold"><i className="fas fa-spinner fa-spin mr-2" /> Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic">No hay registros para esta licencia.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase font-bold">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="font-black text-indigo-500 uppercase tracking-tighter">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{log.user_id?.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

/**
 * ManualDateModal - Modal para editar fecha exacto
 */
function ManualDateModal({ license, open, onClose, onSave }: { license: License | null; open: boolean; onClose: () => void; onSave: (d: string) => Promise<void> }) {
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (license?.expires_at) {
      const d = new Date(license.expires_at);
      if (!isNaN(d.getTime())) {
        setDate(d.toISOString().split('T')[0]);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [license]);

  const handleSave = async () => {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      alert("La fecha seleccionada no es válida.");
      return;
    }
    setLoading(true);
    try {
      await onSave(d.toISOString());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar Expiración Manual" size="sm">
      <div className="space-y-6 pt-2 pb-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nueva Fecha de Vencimiento</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 outline-none" />
        </div>
        <Button variant="primary" full loading={loading} onClick={handleSave}>Actualizar Fecha</Button>
      </div>
    </Modal>
  );
}

/**
 * DeleteLicenseModal - Borrado seguro con pass
 */
function DeleteLicenseModal({ license, open, onClose, onDelete }: { license: License | null; open: boolean; onClose: () => void; onDelete: (pass: string) => Promise<void> }) {
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!pass) return;
    setLoading(true);
    try {
      await onDelete(pass);
      setPass('');
      onClose();
    } catch {
      // Error handled by hook notifications
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="sm" showHeader={false}>
      <div className="p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-3xl shadow-xl shadow-rose-500/5 ring-4 ring-rose-500/5">
          <i className="fas fa-exclamation-triangle animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Acción Irreversible</h3>
          <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[240px]">
            Estás a punto de eliminar la licencia <span className="text-rose-500 underline font-black">{license?.key}</span>. Todos los datos se perderán para siempre.
          </p>
        </div>

        <div className="w-full space-y-4">
          <div className="relative group">
            <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Contraseña"
              className="w-full pl-11 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-rose-500/50 text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="danger"
              full
              loading={loading}
              onClick={handleDelete}
              className="py-4 !rounded-2xl shadow-xl shadow-rose-500/20 text-sm font-black uppercase tracking-widest hover:scale-[1.02] transition-transform"
            >
              Confirmar Eliminación
            </Button>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-2"
            >
              Mejor no, volver atrás
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

type TabFilter = 'all' | 'active' | 'inactive';

export function LicensesView() {
  const {
    licenses, agencies, loadingDeps, metrics,
    extendLicense, toggleLicense, createLicense, deleteLicense, updateLicenseDate
  } = useAdminData();

  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');

  // Modales State
  const [createOpen, setCreateOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<License | null>(null);
  const [dateTarget, setDateTarget] = useState<License | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);

  // ── Stats Calculation ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeArr = licenses.filter(l => licenseStatus(l) === 'active');
    const today = licenses.reduce((acc, l) => acc + (l.today_leads || 0), 0);
    const total = licenses.reduce((acc, l) => acc + (l.total_leads || 0), 0);
    const sessions = Object.values(metrics).filter(m => {
      if (!m.last_ping) return false;
      const ping = new Date(m.last_ping);
      return (new Date().getTime() - ping.getTime()) < 120000;
    }).length;

    return { active: activeArr.length, today, total, sessions };
  }, [licenses, metrics]);

  // ── Ranking Calculation ────────────────────────────────────────────────────
  const ranking = useMemo(() => {
    return [...licenses]
      .filter(l => (l.today_leads || 0) > 0)
      .sort((a, b) => (b.today_leads || 0) - (a.today_leads || 0))
      .slice(0, 5);
  }, [licenses]);

  const filtered = useMemo(() => {
    let result = licenses;
    if (tab === 'active') result = result.filter(l => licenseStatus(l) === 'active');
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
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs uppercase shadow-sm">ID</div>
          <div>
            <p className="font-mono font-black text-indigo-500 text-sm tracking-tight leading-none mb-1">{l.key}</p>
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
              <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isOnline ? "bg-emerald-500 shadow-sm" : "bg-slate-300")} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">{isOnline ? 'En Línea' : 'Desconectado'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'today_leads' as const,
      header: 'Producción Hoy',
      render: (l: License) => {
        const todayLeads = Number(l.today_leads || metrics?.[l.id]?.today || 0);
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${Math.min(100, todayLeads * 2)}%` }} />
            </div>
            <span className="text-sm font-black text-slate-700 dark:text-white tabular-nums">{isNaN(todayLeads) ? 0 : todayLeads}</span>
          </div>
        );
      },
    },
    {
      key: 'total_leads' as const,
      header: 'Acumulado',
      render: (l: License) => {
        const totalLeads = l.total_leads || metrics?.[l.id]?.total || 0;
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
            <i className="fas fa-chart-line text-[10px] text-slate-400" />
            <span className="text-xs font-black text-slate-600 dark:text-slate-400">{totalLeads.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      key: 'id' as const,
      header: 'Control Administrativo',
      render: (l: License) => {
        const isActive = licenseStatus(l) === 'active';
        return (
          <div className="flex gap-1.5 justify-end">
            <button title="Auditoría" onClick={() => setAuditTarget(l)} className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 hover:scale-110 transition-all border border-indigo-100 dark:border-indigo-500/10"><i className="fas fa-microscope text-xs" /></button>
            <button title="Editar fecha" onClick={() => setDateTarget(l)} className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500 hover:scale-110 transition-all border border-violet-100 dark:border-violet-500/10"><i className="fas fa-calendar-alt text-xs" /></button>
            <button title="Extender +30" onClick={() => extendLicense(l.id, 30)} className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 hover:scale-110 transition-all border border-amber-100 dark:border-amber-500/10"><i className="fas fa-calendar-plus text-xs" /></button>
            <button title={isActive ? 'Desactivar' : 'Activar'} onClick={() => toggleLicense(l.id)} className={clsx("w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 border", isActive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border-emerald-100 dark:border-emerald-500/10" : "bg-slate-50 dark:bg-slate-500/10 text-slate-500 border-slate-100 dark:border-slate-500/10")}><i className="fas fa-power-off text-xs" /></button>
            <button title="Eliminar" onClick={() => setDeleteTarget(l)} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 hover:scale-110 transition-all border border-rose-100 dark:border-rose-500/10"><i className="fas fa-trash text-xs" /></button>
          </div>
        );
      },
    },
  ];

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Todas las Licencias' },
    { key: 'active', label: 'Activas' },
    { key: 'inactive', label: 'Inactivas / Exp' },
  ];

  return (
    <div className="space-y-8 animate-fade-in p-2">
      <PageHeader title="Consola de Licencias" subtitle="Gestión integral y telemetría de acceso para administradores." />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Agentes Activos', value: stats.active, icon: 'fa-id-badge', color: 'indigo' },
          { label: 'Sesiones En Vivo', value: stats.sessions, icon: 'fa-bolt', color: 'emerald', pulse: true },
          { label: 'Producción Hoy', value: stats.today, icon: 'fa-fire', color: 'orange' },
          { label: 'Leads Totales', value: stats.total, icon: 'fa-database', color: 'blue' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-3xl p-6 border border-slate-100 dark:border-white/5 relative overflow-hidden group">
            <div className="relative flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl bg-${s.color}-500 shadow-xl shadow-${s.color}-500/20 flex items-center justify-center text-white text-xl`}>
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
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} className={clsx("pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all pt-2", tab === t.key ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por ID o Nombre..." className="pl-11 pr-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full sm:w-64" />
              </div>
            </div>
            <div className="p-2">
              <DataTable columns={columns} data={filtered} loading={loadingDeps} keyExtractor={l => l.id} emptyMessage="No se encontraron licencias." />
            </div>
          </div>
        </div>

        <div className="space-y-8 h-fit lg:sticky lg:top-8">
          {/* Ranking Card */}
          <div className="glass-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-lg shadow-indigo-500/5">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 text-white relative">
              <h3 className="text-xl font-black italic tracking-tighter uppercase">Top Reclutadores</h3>
              <p className="text-xs text-white/70 font-black uppercase tracking-widest mt-1">Líderes de Producción Hoy</p>
              <i className="fas fa-trophy absolute top-8 right-8 text-4xl text-white/10" />
            </div>
            <div className="p-4 space-y-3">
              {ranking.length === 0 ? (
                <div className="py-10 text-center text-slate-400 italic text-xs">Sin actividad por ahora</div>
              ) : (
                ranking.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-slate-800/10 hover:border-indigo-200 transition-colors group">
                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs", i === 0 ? "bg-amber-400 text-amber-900" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-orange-900" : "bg-slate-100 text-slate-500")}>#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none mb-1 truncate">{l.recruiter_name}</p>
                      <p className="text-[9px] font-black font-mono text-slate-400 leading-none">{l.key}</p>
                    </div>
                    <p className="text-xs font-black text-indigo-500">{l.today_leads}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button variant="primary" full className="!rounded-[2rem] py-6 shadow-2xl shadow-indigo-500/20 text-md" onClick={() => setCreateOpen(true)}>
            <i className="fas fa-plus-circle mr-3" />Generar Licencia
          </Button>
        </div>
      </div>

      {/* MODALES */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva Licencia DreamLive" size="md">
        <CreateLicenseForm agencies={agencies} onCreate={createLicense} onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <AuditLicenseModal license={auditTarget} open={!!auditTarget} onClose={() => setAuditTarget(null)} />

      <ManualDateModal
        license={dateTarget}
        open={!!dateTarget}
        onClose={() => setDateTarget(null)}
        onSave={(d) => updateLicenseDate(dateTarget!.id, d)}
      />

      <DeleteLicenseModal
        license={deleteTarget}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={(p) => deleteLicense(deleteTarget!.id, p)}
      />
    </div>
  );
}
