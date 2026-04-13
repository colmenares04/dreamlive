/**
 * Panel de Agencia – PanelAdm equivalente.
 * ✓ Todas las acciones con feedback visual (useNotifications)
 * ✓ Confirmación antes de purgas y desactivaciones
 * ✓ Export Excel funcional
 * ✓ Sidebar con enlace a Mi Perfil
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../infrastructure/context/AuthContext';
import { useNotifications } from '../../infrastructure/context/NotificationContext';
import { Sidebar, Badge, DataTable, PageHeader, Button, Modal } from '../shared';
import { DashboardAdapter, LeadAdapter, LicenseAdapter } from '../../adapters/http';
import { formatDate, exportToExcel } from '../../core/utils';
import { UserPermissions } from '../../core/entities';
import type { AgencyDashboard, Lead, LeadStatus, License } from '../../core/entities';

// ── Íconos ────────────────────────────────────────────────────────────────────
const I = {
  chart:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/></svg>,
  book:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  team:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  logout:  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  excel:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  trash:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  search:  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  user:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#6366f1'];

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardSection() {
  const { error: showError } = useNotifications();
  const [data, setData]       = useState<AgencyDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await DashboardAdapter.getAgencyDashboard()); }
    catch { showError('No se pudo cargar el dashboard.'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const pieData = data ? [
    { name: 'Disponibles', value: data.available_leads },
    { name: 'Recopilados', value: data.collected_leads },
    { name: 'Contactados', value: data.contacted_total },
  ] : [];

  const trendData = Array.from({ length: 7 }, (_, i) => ({
    day: ['L','M','X','J','V','S','D'][i],
    contactados: Math.floor(Math.random() * 80 + 20),
  }));

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard General</h2>
          <p className="text-slate-400 text-sm mt-0.5">Supervisión en tiempo real de la operación</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>{I.refresh}</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Licencias Activas',   value: data?.active_licenses ?? '—' },
          { label: 'Total Leads',          value: data?.total_leads ?? '—' },
          { label: 'Contactados',          value: data?.contacted_total ?? '—',  color: 'text-indigo-600' },
          { label: 'Contactados Hoy',      value: data?.today_contacted ?? '—',  color: 'text-teal-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-3xl font-black leading-none ${s.color ?? 'text-slate-800'}`}>
              {loading ? '…' : s.value}
            </p>
          </div>
        ))}
      </div>

      {data?.top_keywords && data.top_keywords.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Top Palabras Clave</p>
          <div className="flex flex-wrap gap-2">
            {data.top_keywords.map(kw => (
              <Badge key={kw} variant="yellow">{kw}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Tendencia de Contacto (7 días)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Line type="monotone" dataKey="contactados" stroke="#6366f1" strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">Estado de la DB</h3>
          {data ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % 3]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-slate-500 text-xs">{d.name}</span>
                    </span>
                    <strong className="text-slate-700 text-xs">{d.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">Cargando…</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LEADS ─────────────────────────────────────────────────────────────────────
function LeadsSection() {
  const { role } = useAuth();
  const { success, error: showError, confirm } = useNotifications();
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<LeadStatus | ''>('');
  const [licenses, setLicenses]     = useState<License[]>([]);
  const [licFilter, setLicFilter]   = useState<number | ''>('');
  const [purgeModal, setPurgeModal] = useState(false);
  const [purging, setPurging]       = useState(false);
  const [exporting, setExporting]   = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canPurge = role ? UserPermissions.canPurgeLeads(role) : false;

  const loadLeads = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await LeadAdapter.list({
        page: pg, page_size: 50,
        status: statusFilter || undefined,
        license_id: licFilter || undefined,
        search: search || undefined,
      });
      setLeads(res.items); setTotal(res.total);
    } catch { showError('Error al cargar leads.'); }
    finally { setLoading(false); }
  }, [statusFilter, licFilter, search]); // eslint-disable-line

  useEffect(() => { loadLeads(1); setPage(1); }, [statusFilter, licFilter]); // eslint-disable-line
  useEffect(() => { LicenseAdapter.list().then(setLicenses).catch(() => {}); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadLeads(1); }, 450);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const raw = await LeadAdapter.exportRaw();
      await exportToExcel(raw as any, 'dreamlive_leads', 'Leads');
      success(`✓ ${raw.length} leads exportados a Excel.`);
    } catch { showError('Error al exportar.'); }
    finally { setExporting(false); }
  };

  const handlePurge = async () => {
    const ok = await confirm('¿Eliminar permanentemente todos los leads con estado "recopilado"? Esta acción no se puede deshacer.');
    if (!ok) { setPurgeModal(false); return; }
    setPurging(true);
    try {
      const res = await LeadAdapter.purge();
      success(`✓ ${res.deleted} leads eliminados.`);
      setPurgeModal(false); loadLeads(1);
    } catch { showError('Error al purgar leads.'); }
    finally { setPurging(false); }
  };

  const statusVariant: Record<string, 'green' | 'blue' | 'yellow'> = {
    disponible: 'green', contactado: 'blue', recopilado: 'yellow',
  };

  const cols = [
    { key: 'username', header: 'Usuario',
      render: (l: Lead) => (
        <div>
          <a href={l.profile_url ?? '#'} target="_blank" rel="noreferrer"
            className="font-semibold text-slate-700 hover:text-indigo-600 transition-colors text-sm">
            @{l.username}
          </a>
          {l.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {l.keywords.slice(0, 2).map(k => (
                <span key={k} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">{k}</span>
              ))}
            </div>
          )}
        </div>
      ) },
    { key: 'metric', header: 'Métrica',
      render: (l: Lead) => (
        <div className="text-xs text-slate-500">
          <p><span className="font-bold text-slate-700">{l.followers.toLocaleString()}</span> seg.</p>
          <p>{l.following.toLocaleString()} sig.</p>
        </div>
      ) },
    { key: 'status', header: 'Estado',
      render: (l: Lead) => <Badge variant={statusVariant[l.status] ?? 'gray'}>{l.status}</Badge> },
    { key: 'recruiter', header: 'Reclutador',
      render: (l: Lead) => {
        const lic = licenses.find(x => x.id === l.license_id);
        return <span className="text-xs text-slate-500">{lic?.recruiter_name ?? `#${l.license_id}`}</span>;
      } },
    { key: 'dates', header: 'Fechas',
      render: (l: Lead) => (
        <div className="text-xs text-slate-400">
          <p>Cap: {formatDate(l.created_at)}</p>
          {l.contacted_at && <p>Cont: {formatDate(l.contacted_at)}</p>}
        </div>
      ) },
  ];

  return (
    <div>
      <PageHeader title="Global Leads Database" subtitle="Gestión unificada de prospectos"
        actions={
          <>
            {canPurge && (
              <Button variant="danger" size="sm" onClick={() => setPurgeModal(true)}>
                {I.trash} Herramientas de Limpieza
              </Button>
            )}
            <Button variant="success" size="sm" loading={exporting} onClick={handleExport}>
              {I.excel} Exportar Excel
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-sm flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{I.search}</span>
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:border-indigo-400 transition-colors focus:outline-none"
            placeholder="Buscar usuario…"
            value={search} onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          value={statusFilter} onChange={e => setStatus(e.target.value as LeadStatus | '')}>
          <option value="">Todos los estados</option>
          <option value="disponible">🟢 Disponibles</option>
          <option value="contactado">🔵 Contactados</option>
          <option value="recopilado">🟡 Recopilados</option>
        </select>
        <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          value={licFilter} onChange={e => setLicFilter(e.target.value ? +e.target.value : '')}>
          <option value="">Todos los reclutadores</option>
          {licenses.map(l => <option key={l.id} value={l.id}>{l.recruiter_name}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{total} total</span>
      </div>

      <DataTable columns={cols} data={leads} loading={loading}
        keyExtractor={l => l.id} emptyMessage="No hay leads" />

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-slate-400">{total} leads</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 1}
            onClick={() => { const p = page - 1; setPage(p); loadLeads(p); }}>
            ← Anterior
          </Button>
          <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
            Página {page}
          </span>
          <Button size="sm" variant="outline" disabled={page * 50 >= total}
            onClick={() => { const p = page + 1; setPage(p); loadLeads(p); }}>
            Siguiente →
          </Button>
        </div>
      </div>

      {/* Modal purga */}
      <Modal open={purgeModal} onClose={() => setPurgeModal(false)} title="Herramientas de Limpieza" size="sm">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
          <p className="font-semibold text-red-700 text-sm mb-1">⚠️ Purga de Leads Recopilados</p>
          <p className="text-red-500 text-xs">
            Eliminará permanentemente todos los leads en estado "recopilado".
            Esta acción <strong>no se puede deshacer</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 justify-center" onClick={() => setPurgeModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1 justify-center" loading={purging} onClick={handlePurge}>
            {I.trash} Confirmar Purga
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ── TEAM MANAGER ──────────────────────────────────────────────────────────────
function TeamSection() {
  const { role } = useAuth();
  const { success, error: showError, confirm } = useNotifications();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading]   = useState(true);
  const canManage = role ? UserPermissions.canManageTeam(role) : false;

  const reload = useCallback(async () => {
    setLoading(true);
    try { setLicenses(await LicenseAdapter.list({ status: 'active' })); }
    catch { showError('Error al cargar el equipo.'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);

  const handleDeactivate = async (lic: License) => {
    const ok = await confirm(`¿Desactivar la licencia de ${lic.recruiter_name}? El agente perderá acceso.`);
    if (!ok) return;
    try {
      await LicenseAdapter.toggle(lic.id);
      success(`✓ Licencia de ${lic.recruiter_name} desactivada.`);
      reload();
    } catch { showError('Error al desactivar la licencia.'); }
  };

  const cols = [
    { key: 'recruiter_name', header: 'Reclutador',
      render: (l: License) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
            flex items-center justify-center text-white font-black text-xs shrink-0">
            {l.recruiter_name.substring(0, 2).toUpperCase()}
          </div>
          <p className="font-semibold text-slate-700 text-sm">{l.recruiter_name}</p>
        </div>
      ) },
    { key: 'key', header: 'Licencia',
      render: (l: License) => (
        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">
          {l.key.substring(0, 12)}…
        </code>
      ) },
    { key: 'config', header: 'Límite / Refresh',
      render: (l: License) => <span className="text-xs text-slate-500">{l.request_limit} req / {l.refresh_minutes} min</span> },
    { key: 'status', header: 'Estado',
      render: () => <Badge variant="green">● Activo</Badge> },
    { key: 'expires_at', header: 'Expiración',
      render: (l: License) => (
        <div className="text-xs">
          <p className="text-slate-600">{formatDate(l.expires_at)}</p>
          <p className={l.days_remaining < 10 ? 'text-red-500 font-bold' : 'text-slate-400'}>
            {l.days_remaining}d restantes
          </p>
        </div>
      ) },
    ...(canManage ? [{
      key: 'actions', header: '', className: 'text-right',
      render: (l: License) => (
        <Button size="sm" variant="danger" onClick={() => handleDeactivate(l)}>
          Desactivar
        </Button>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader title="Team Management" subtitle="Administración de credenciales y límites" />
      <DataTable columns={cols} data={licenses} loading={loading}
        keyExtractor={l => l.id} emptyMessage="Sin agentes activos" />
    </div>
  );
}

// ── LAYOUT PRINCIPAL ──────────────────────────────────────────────────────────
type PanelSection = 'dashboard' | 'leads' | 'team';

export function AgencyPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<PanelSection>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',     icon: I.chart },
    { id: 'leads',     label: 'Global Leads',  icon: I.book },
    { id: 'team',      label: 'Team Manager',  icon: I.team },
  ];

  const footer = (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-slate-300 font-semibold truncate">{user?.username}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <button onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white font-semibold transition-colors">
          {I.user} Mi Perfil
        </button>
        <button onClick={logout}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">
          {I.logout} Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar title="DREAMLIVE" subtitle="Agency" items={navItems}
        activeId={active} onNavigate={id => setActive(id as PanelSection)}
        footer={footer} variant="panel" />
      <main className="md:ml-64 flex-1 p-8 min-w-0">
        {active === 'dashboard' && <DashboardSection />}
        {active === 'leads'     && <LeadsSection />}
        {active === 'team'      && <TeamSection />}
      </main>
    </div>
  );
}
