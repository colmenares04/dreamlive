/**
 * Panel de Administrador / Programador – AdminUP equivalente.
 * ✓ Todas las acciones con feedback visual (useNotifications)
 * ✓ Confirmación antes de acciones destructivas
 * ✓ Purga operativa en Vista General
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../infrastructure/context/AuthContext';
import { useNotifications } from '../../infrastructure/context/NotificationContext';
import { Sidebar, Badge, Modal, DataTable, Collapsible, PageHeader, Button } from '../shared';
import { OverviewAdapter, LicenseAdapter, AgencyAdapter, VersionAdapter, LeadAdapter } from '../../adapters/http';
import { formatDate, formatFileSize } from '../../core/utils';
import type { AdminOverview, License, Agency, AppVersion, LicenseStatus } from '../../core/entities';

// ── Íconos ────────────────────────────────────────────────────────────────────
const I = {
  chart:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>,
  key:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>,
  building: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
  cloud:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>,
  logout:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  trash:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  refresh:  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  plus:     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  download: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  user:     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
};

const TAG_META: Record<string, { label: string; cls: string }> = {
  new:  { label: 'Novedad',      cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  fix:  { label: 'Fix',         cls: 'bg-red-100 text-red-700 border-red-200' },
  feat: { label: 'Feature',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  perf: { label: 'Rendimiento', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  sec:  { label: 'Seguridad',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function SC({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// ── VISTA GENERAL ─────────────────────────────────────────────────────────────
function OverviewSection() {
  const { success, error: showError, confirm } = useNotifications();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await OverviewAdapter.getAdminOverview()); }
    catch { showError('No se pudo cargar la vista general.'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const handlePurge = async () => {
    const ok = await confirm(
      `¿Eliminar permanentemente ${data?.pending_collected ?? 0} leads recopilados? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setPurging(true);
    try {
      const res = await LeadAdapter.purge();
      success(`✓ ${res.deleted} leads eliminados.`);
      load();
    } catch { showError('Error al ejecutar la purga.'); }
    finally { setPurging(false); }
  };

  return (
    <div>
      <PageHeader title="Vista General" subtitle="Monitoreo en tiempo real del ecosistema"
        actions={<Button variant="outline" size="sm" onClick={load}>{I.refresh} Refrescar</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <SC label="Licencias Totales"  value={loading ? '…' : data?.total_licenses ?? 0}  icon="🎫" />
        <SC label="Leads Disponibles"  value={loading ? '…' : data?.available_leads ?? 0}  sub="Listos para contactar" icon="👥" />
        <SC label="Agencias Activas"   value={loading ? '…' : data?.active_agencies ?? 0}  icon="🏢" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 text-sm">Acciones de Base de Datos</h3>
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4">
          <div>
            <p className="font-semibold text-red-700 text-sm">Purga de Usuarios Pendientes</p>
            <p className="text-red-500 text-xs mt-0.5">
              Elimina leads con estado «recopilado».{' '}
              <strong>Pendientes: {loading ? '…' : data?.pending_collected ?? 0}</strong>
            </p>
          </div>
          <Button variant="danger" size="sm" loading={purging} onClick={handlePurge}>
            {I.trash} Ejecutar Purga
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── LICENCIAS ─────────────────────────────────────────────────────────────────
function LicensesSection() {
  const { success, error: showError, confirm } = useNotifications();
  const [licenses, setLicenses]   = useState<License[]>([]);
  const [agencies, setAgencies]   = useState<Agency[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all' | LicenseStatus>('all');
  const [creating, setCreating]   = useState(false);
  const [extendTarget, setExtendTarget] = useState<License | null>(null);
  const [extendDays, setExtendDays]     = useState(30);
  const [form, setForm] = useState({ agency_id: 0, recruiter_name: '', days: 30, request_limit: 60, refresh_minutes: 1 });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [lics, ags] = await Promise.all([LicenseAdapter.list(), AgencyAdapter.list()]);
      setLicenses(lics); setAgencies(ags);
    } catch { showError('Error al cargar licencias.'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    if (!form.agency_id || !form.recruiter_name.trim()) {
      showError('Completa la agencia y el nombre del reclutador.'); return;
    }
    setCreating(true);
    try {
      const lic = await LicenseAdapter.create(form);
      success(`✓ Licencia creada: ${lic.key.substring(0, 12)}…`);
      setForm({ agency_id: 0, recruiter_name: '', days: 30, request_limit: 60, refresh_minutes: 1 });
      reload();
    } catch (e: any) { showError(e?.response?.data?.detail ?? 'Error al crear licencia.'); }
    finally { setCreating(false); }
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    try {
      const res = await LicenseAdapter.extend(extendTarget.id, extendDays);
      success(`✓ Extendida. Vence: ${formatDate(res.expires_at)}`);
      setExtendTarget(null); reload();
    } catch { showError('Error al extender la licencia.'); }
  };

  const handleToggle = async (lic: License) => {
    const action = lic.status === 'active' ? 'desactivar' : 'activar';
    const ok = await confirm(`¿${action[0].toUpperCase() + action.slice(1)} la licencia de ${lic.recruiter_name}?`);
    if (!ok) return;
    try {
      const res = await LicenseAdapter.toggle(lic.id);
      success(`✓ Licencia ${res.status === 'active' ? 'activada' : 'desactivada'}.`);
      reload();
    } catch { showError('Error al cambiar el estado.'); }
  };

  const filtered = filter === 'all' ? licenses : licenses.filter(l => l.status === filter);

  const cols = [
    { key: 'key', header: 'Clave',
      render: (l: License) => <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">{l.key.substring(0,16)}…</code> },
    { key: 'recruiter_name', header: 'Agencia / Reclutador',
      render: (l: License) => (
        <div>
          <p className="font-semibold text-sm text-slate-700">{l.recruiter_name}</p>
          <p className="text-xs text-slate-400">{agencies.find(a => a.id === l.agency_id)?.name ?? `#${l.agency_id}`}</p>
        </div>
      ) },
    { key: 'status', header: 'Estado',
      render: (l: License) => <Badge variant={l.status === 'active' ? 'green' : 'red'}>{l.status === 'active' ? '● Activa' : '● Inactiva'}</Badge> },
    { key: 'expires_at', header: 'Vencimiento',
      render: (l: License) => (
        <div className="text-xs">
          <p className="text-slate-600">{formatDate(l.expires_at)}</p>
          <p className={l.days_remaining < 10 ? 'text-red-500 font-bold' : 'text-slate-400'}>{l.days_remaining}d restantes</p>
        </div>
      ) },
    { key: 'config', header: 'Config',
      render: (l: License) => <span className="text-xs text-slate-500">{l.request_limit} req / {l.refresh_minutes} min</span> },
    { key: 'actions', header: 'Acciones', className: 'text-right',
      render: (l: License) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="outline" onClick={() => { setExtendTarget(l); setExtendDays(30); }}>Extender</Button>
          <Button size="sm" variant={l.status === 'active' ? 'danger' : 'success'} onClick={() => handleToggle(l)}>
            {l.status === 'active' ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ) },
  ];

  return (
    <div>
      <PageHeader title="Gestión de Licencias" subtitle="Crea, extiende y audita accesos" />
      <Collapsible title="+ Generar Nueva Licencia">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Agencia</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              value={form.agency_id} onChange={e => setForm(f => ({...f, agency_id: +e.target.value}))}>
              <option value={0}>Seleccionar…</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Reclutador</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Ej: Agente 007" value={form.recruiter_name}
              onChange={e => setForm(f => ({...f, recruiter_name: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Duración</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              value={form.days} onChange={e => setForm(f => ({...f, days: +e.target.value}))}>
              <option value={30}>Mensual (30 días)</option>
              <option value={90}>Trimestral (90 días)</option>
              <option value={365}>Anual (365 días)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Req. límite</label>
              <input type="number" min={1} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={form.request_limit} onChange={e => setForm(f => ({...f, request_limit: +e.target.value}))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mins</label>
              <input type="number" min={1} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={form.refresh_minutes} onChange={e => setForm(f => ({...f, refresh_minutes: +e.target.value}))} />
            </div>
          </div>
        </div>
        <Button variant="primary" size="sm" loading={creating} onClick={handleCreate}>{I.plus} Crear Licencia</Button>
      </Collapsible>

      <div className="flex gap-1 mb-4 items-center">
        {(['all','active','inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Inactivas'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <DataTable columns={cols} data={filtered} loading={loading} keyExtractor={l => l.id} emptyMessage="No hay licencias" />

      <Modal open={!!extendTarget} onClose={() => setExtendTarget(null)} title="Extender Licencia" size="sm">
        <p className="text-sm text-slate-600 mb-4">Reclutador: <strong>{extendTarget?.recruiter_name}</strong></p>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Días a extender</label>
        <input type="number" min={1} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
          value={extendDays} onChange={e => setExtendDays(+e.target.value)} />
        <Button variant="primary" onClick={handleExtend} className="w-full justify-center">Confirmar Extensión</Button>
      </Modal>
    </div>
  );
}

// ── AGENCIAS ──────────────────────────────────────────────────────────────────
function AgenciesSection() {
  const { success, error: showError } = useNotifications();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ name: '', code: '' });

  useEffect(() => {
    AgencyAdapter.list()
      .then(setAgencies)
      .catch(() => showError('Error al cargar agencias.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) { showError('Completa nombre y código.'); return; }
    setCreating(true);
    try {
      const agency = await AgencyAdapter.create(form);
      setAgencies(prev => [...prev, agency]);
      success(`✓ Agencia "${agency.name}" creada.`);
      setModal(false); setForm({ name: '', code: '' });
    } catch (e: any) { showError(e?.response?.data?.detail ?? 'Error al crear agencia.'); }
    finally { setCreating(false); }
  };

  return (
    <div>
      <PageHeader title="Agencias" subtitle="Organizaciones registradas en el sistema"
        actions={<Button variant="primary" size="sm" onClick={() => setModal(true)}>{I.plus} Nueva Agencia</Button>} />
      {loading ? (
        <p className="text-center py-12 text-slate-400 text-sm">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-black text-sm">
                  {a.code.substring(0, 2)}
                </div>
                <Badge variant={a.is_active ? 'green' : 'red'}>{a.is_active ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <p className="font-bold text-slate-800">{a.name}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{a.code}</p>
            </div>
          ))}
          {agencies.length === 0 && <p className="text-slate-400 text-sm col-span-3 text-center py-10">Sin agencias.</p>}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Agencia" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Ej: Elite Agency" value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Código (4–6 letras)</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase"
              placeholder="ELITE" maxLength={6} value={form.code}
              onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} />
          </div>
          <Button variant="primary" loading={creating} onClick={handleCreate} className="w-full justify-center">Crear Agencia</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── ACTUALIZACIONES ───────────────────────────────────────────────────────────
function UpdatesSection() {
  const { success, error: showError, confirm } = useNotifications();
  const [versions, setVersions]     = useState<AppVersion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedTags, setTags]     = useState<string[]>([]);
  const [form, setForm] = useState({ version_number: '', changelog: '', windows_url: '', windows_size_kb: 0, macos_url: '', macos_size_kb: 0 });

  const reload = useCallback(async () => {
    setLoading(true);
    try { setVersions(await VersionAdapter.list()); }
    catch { showError('Error al cargar versiones.'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);

  const toggleTag = (t: string) => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const handlePublish = async () => {
    if (!form.version_number.trim()) { showError('Escribe el número de versión.'); return; }
    if (!form.windows_url.trim() || !form.macos_url.trim()) { showError('Proporciona las URLs de ambas plataformas.'); return; }
    const ok = await confirm(`¿Publicar v${form.version_number} para Windows y macOS? Las versiones activas actuales se desactivarán.`);
    if (!ok) return;
    setPublishing(true);
    try {
      const res = await VersionAdapter.publish({ ...form, tags: selectedTags });
      success(`✓ Versión ${res.version} publicada en ${res.published} plataformas.`);
      setForm({ version_number: '', changelog: '', windows_url: '', windows_size_kb: 0, macos_url: '', macos_size_kb: 0 });
      setTags([]); reload();
    } catch (e: any) { showError(e?.response?.data?.detail ?? 'Error al publicar.'); }
    finally { setPublishing(false); }
  };

  const handleDelete = async (v: AppVersion) => {
    const ok = await confirm(`¿Eliminar v${v.version_number} (${v.platform})? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try { await VersionAdapter.remove(v.id); success('✓ Versión eliminada.'); reload(); }
    catch { showError('Error al eliminar la versión.'); }
  };

  const handleActivate = async (v: AppVersion) => {
    const ok = await confirm(`¿Activar v${v.version_number} (${v.platform})?`);
    if (!ok) return;
    try { await VersionAdapter.activate(v.id); success(`✓ v${v.version_number} activada.`); reload(); }
    catch { showError('Error al activar.'); }
  };

  const cols = [
    { key: 'version_number', header: 'Versión',
      render: (v: AppVersion) => <span className="font-bold text-teal-700">v{v.version_number}</span> },
    { key: 'platform', header: 'Plat.',
      render: (v: AppVersion) => <span className={`text-xs font-bold ${v.platform === 'windows' ? 'text-blue-600' : 'text-slate-600'}`}>{v.platform === 'windows' ? '🪟 Win' : '🍎 Mac'}</span> },
    { key: 'tags', header: 'Etiquetas',
      render: (v: AppVersion) => (
        <div className="flex flex-wrap gap-1">
          {v.tags.map(t => <span key={t} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TAG_META[t]?.cls ?? ''}`}>{TAG_META[t]?.label ?? t}</span>)}
        </div>
      ) },
    { key: 'changelog', header: 'Changelog',
      render: (v: AppVersion) => <span className="text-xs text-slate-500 line-clamp-2">{v.changelog || '—'}</span> },
    { key: 'release_date', header: 'Fecha / Tamaño',
      render: (v: AppVersion) => (
        <div className="text-xs">
          <p className="text-slate-600">{formatDate(v.release_date)}</p>
          <p className="text-slate-400">{formatFileSize(v.file_size_kb)}</p>
        </div>
      ) },
    { key: 'is_active', header: 'Estado',
      render: (v: AppVersion) => <Badge variant={v.is_active ? 'green' : 'gray'}>{v.is_active ? '● Activa' : 'Inactiva'}</Badge> },
    { key: 'actions', header: '', className: 'text-right',
      render: (v: AppVersion) => (
        <div className="flex gap-1 justify-end">
          {!v.is_active && <Button size="sm" variant="success" onClick={() => handleActivate(v)}>Activar</Button>}
          <a href={v.file_url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{I.download}</Button></a>
          <Button size="sm" variant="danger" onClick={() => handleDelete(v)}>{I.trash}</Button>
        </div>
      ) },
  ];

  return (
    <div>
      <PageHeader title="Centro de Actualizaciones" subtitle="Versiones para Windows y macOS" />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Versión unificada</label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              placeholder="x.y.z" value={form.version_number}
              onChange={e => setForm(f => ({...f, version_number: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Cambios</label>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {Object.entries(TAG_META).map(([key, meta]) => (
                <button key={key} onClick={() => toggleTag(key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${selectedTags.includes(key) ? meta.cls + ' scale-105' : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'}`}>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {(['windows', 'macos'] as const).map(plat => (
            <div key={plat} className="border-2 border-dashed border-slate-200 rounded-xl p-4">
              <p className="font-bold text-slate-700 text-sm mb-2">{plat === 'windows' ? '🪟 Windows Build' : '🍎 macOS Build'}</p>
              <input className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs mb-2"
                placeholder={`URL del archivo`}
                value={plat === 'windows' ? form.windows_url : form.macos_url}
                onChange={e => setForm(f => ({...f, [`${plat}_url`]: e.target.value}))} />
              <input type="number" min={0} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                placeholder="Tamaño en KB"
                value={plat === 'windows' ? form.windows_size_kb : form.macos_size_kb}
                onChange={e => setForm(f => ({...f, [`${plat}_size_kb`]: +e.target.value}))} />
            </div>
          ))}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Changelog General</label>
          <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2}
            placeholder="Describe las mejoras…" value={form.changelog}
            onChange={e => setForm(f => ({...f, changelog: e.target.value}))} />
        </div>
        <Button variant="primary" loading={publishing} onClick={handlePublish}>{I.cloud} Publicar Versión Dual</Button>
      </div>
      <DataTable columns={cols} data={versions} loading={loading} keyExtractor={v => v.id} emptyMessage="No hay versiones publicadas" />
    </div>
  );
}

// ── LAYOUT PRINCIPAL ──────────────────────────────────────────────────────────
type AdminSection = 'overview' | 'licenses' | 'agencies' | 'updates';

export function AdminConsole() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<AdminSection>('overview');

  const navItems = [
    { id: 'overview', label: 'Vista General',   icon: I.chart },
    { id: 'licenses', label: 'Licencias',        icon: I.key },
    { id: 'agencies', label: 'Agencias',         icon: I.building },
    { id: 'updates',  label: 'Actualizaciones',  icon: I.cloud },
  ];

  const footer = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        <span className="text-xs text-emerald-400 font-semibold">Conectado</span>
      </div>
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
      <Sidebar title="DREAMLIVE" subtitle="Console" items={navItems}
        activeId={active} onNavigate={id => setActive(id as AdminSection)}
        footer={footer} variant="admin" />
      <main className="md:ml-64 flex-1 p-8 min-w-0">
        {active === 'overview' && <OverviewSection />}
        {active === 'licenses' && <LicensesSection />}
        {active === 'agencies' && <AgenciesSection />}
        {active === 'updates'  && <UpdatesSection />}
      </main>
    </div>
  );
}
