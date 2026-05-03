/**
 * AgenciesView.tsx
 * 
 * Vista de administración para la gestión de agencias registradas.
 * Permite visualizar métricas generales, crear nuevas agencias y 
 * gestionar el detalle de cada una via modal.
 */
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../admin/hooks/useAdminData';
import { PageHeader, Button, Badge } from '../../shared';
import { Modal } from '../../../components/ui';
import clsx from 'clsx';
import { AgencyAdapter } from '../../../services';
import type { Agency } from '../../../core/entities';

/**
 * AgencyCard
 * 
 * Renderiza una tarjeta individual para una agencia con su estado
 * y contador de licencias.
 * 
 * @param {Object} props
 * @param {Agency} props.agency - Entidad de la agencia.
 * @param {number} props.licenseCount - Número de licencias activas.
 * @param {Function} props.onView - Callback para ver el detalle.
 */
function AgencyCard({ agency, licenseCount, onView }: { agency: Agency; licenseCount: number; onView: (agency: Agency) => void }) {
  const initial = agency.name.charAt(0).toUpperCase();
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500'];
  const color = colors[agency.name.charCodeAt(0) % colors.length];

  return (
    <div className="group glass-card rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 animate-scale-in">
      <div className="flex items-start justify-between mb-6">
        <div className={clsx(
          color,
          "text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-500"
        )}>
          {initial}
        </div>
        <button
          onClick={() => onView(agency)}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-indigo-500 transition-all shadow-sm"
        >
          <i className="fas fa-expand-alt text-sm" />
        </button>
      </div>

      <h3 className="font-black text-slate-800 dark:text-white text-lg mb-2 tracking-tight">{agency.name}</h3>

      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm font-bold">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <i className="fas fa-users text-indigo-500" />
            <span>{licenseCount} Reclutadores</span>
          </div>
          <Badge variant={agency.is_active ? 'green' : 'gray'}>
            {agency.is_active ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
          <span>Conversión</span>
          <span className="text-indigo-500 font-black">{(licenseCount > 0 ? 'ALTA' : 'PENDIENTE')}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * AgencyDetailModal
 * 
 * Modal detallado para visualizar estadísticas, licencias y 
 * opciones destructivas de una agencia.
 */
function AgencyDetailModal({
  agency,
  onClose,
  onRefresh
}: { agency: Agency | null; onClose: () => void; onRefresh: () => void }) {
  const { deleteAgency } = useAdminData();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (agency) {
      setLoading(true);
      AgencyAdapter.getStats(agency.id!)
        .then(setStats)
        .finally(() => setLoading(false));
    } else {
      setStats(null);
      setShowDeletePrompt(false);
      setConfirmPassword('');
    }
  }, [agency]);

  if (!agency) return null;

  const handleDelete = async () => {
    if (!confirmPassword) return;
    setDeleting(true);
    try {
      await deleteAgency(agency.id!, confirmPassword);
      onClose();
      onRefresh();
    } finally {
      setDeleting(false);
    }
  };

  const conversionRate = stats?.stats?.total_leads > 0
    ? Math.round((stats.stats.contacted_total / stats.stats.total_leads) * 100)
    : 0;

  return (
    <Modal
      isOpen={!!agency}
      onClose={onClose}
      title={agency.name}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-8 py-2">
        {loading ? (
          <div className="grid grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl" />)}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total Leads', value: stats?.stats?.total_leads ?? 0, icon: 'fa-database', color: 'text-indigo-500', bg: 'bg-slate-100 dark:bg-slate-900' },
                  { label: 'Contactados', value: stats?.stats?.contacted_total ?? 0, icon: 'fa-check-double', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Disponibles', value: stats?.stats?.available_leads ?? 0, icon: 'fa-star', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Hoy (Colec)', value: stats?.stats?.today_collected ?? 0, icon: 'fa-calendar-plus', color: 'text-slate-900 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-900/50' },
                  { label: 'Contactados Hoy', value: stats?.stats?.today_contacted ?? 0, icon: 'fa-clock', color: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
                  { label: 'Pendientes', value: stats?.stats?.collected_leads ?? 0, icon: 'fa-hourglass-start', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                ].map((s, i) => (
                  <div key={i} className={clsx(
                    "p-6 rounded-[1.5rem] border-2 border-slate-200 dark:border-white/10 transition-all duration-300 hover:scale-[1.02]",
                    s.bg
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">{s.label}</span>
                      <i className={clsx("fas text-sm opacity-80", s.icon, s.color)} />
                    </div>
                    <p className={clsx("text-4xl font-black tracking-tighter", s.color)}>{s.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-white/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-black text-slate-950 dark:text-slate-100 uppercase tracking-widest">Tasa de Conversión (contactados / total)</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-500">{conversionRate}%</span>
              </div>
              <div className="h-4 bg-slate-200 dark:bg-black rounded-full overflow-hidden border border-slate-300 dark:border-white/5 p-[2px]">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-md"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <i className="fas fa-users text-indigo-500 text-sm" />
                Reclutadores <span className="opacity-60">({stats?.licenses?.length ?? 0})</span>
              </h3>
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-950 dark:text-slate-100 uppercase tracking-widest bg-slate-50 dark:bg-white/5">
                        <th className="px-8 py-6">Reclutador</th>
                        <th className="px-6 py-6">Estado</th>
                        <th className="px-6 py-6">Total</th>
                        <th className="px-6 py-6">Cont.</th>
                        <th className="px-6 py-6">Disp.</th>
                        <th className="px-6 py-6">Límite / Refresh</th>
                        <th className="px-6 py-6 text-center">Expira</th>
                        <th className="px-8 py-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {stats?.licenses?.map((lic: any) => (
                        <tr key={lic.id} className="text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-950 dark:text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{lic.recruiter_name}</div>
                            <div className="text-[9px] font-mono text-slate-600 dark:text-slate-400 mt-1 uppercase">{lic.key}</div>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant={lic.is_active ? 'green' : 'gray'} className="!px-3 !py-1 !text-[9px]">
                              {lic.is_active ? 'ACTIVA' : 'INACTIVA'}
                            </Badge>
                          </td>
                          <td className="px-6 py-5 font-black text-slate-700 dark:text-slate-300">{lic.stats?.total ?? 0}</td>
                          <td className="px-6 py-5 font-black text-emerald-500">{lic.stats?.contacted ?? 0}</td>
                          <td className="px-6 py-5 font-black text-amber-500">{lic.stats?.available ?? 0}</td>
                          <td className="px-6 py-5">
                            <div className="text-xs font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                              <i className="fas fa-bolt text-indigo-500 text-[10px]" />
                              {lic.limit_requests} reqs
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">cada {lic.refresh_minutes} min</div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="bg-slate-800/50 px-3 py-1.5 rounded-xl font-mono text-[11px] text-slate-300 border border-white/5">
                              {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'N/A'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-end items-center gap-1">
                              <button className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all duration-300" title="Auditoría">
                                <i className="fas fa-microscope text-xs" />
                              </button>
                              <button className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all duration-300" title="Editar">
                                <i className="fas fa-edit text-xs" />
                              </button>
                              <button className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all duration-300" title="Activar/Desactivar">
                                <i className="fas fa-power-off text-xs" />
                              </button>
                              <button className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300" title="Eliminar">
                                <i className="fas fa-trash-alt text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Zona de Peligro */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
              {!showDeletePrompt ? (
                <button
                  onClick={() => setShowDeletePrompt(true)}
                  className="flex items-center gap-4 text-rose-500 hover:text-rose-700 font-black text-xs uppercase tracking-widest transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                    <i className="fas fa-trash-alt" />
                  </div>
                  Eliminar permanentemente
                </button>
              ) : (
                <div className="bg-rose-50 dark:bg-rose-500/5 rounded-3xl p-6 border border-rose-100 dark:border-rose-500/20 animate-fade-in">
                  <h5 className="text-rose-800 dark:text-rose-400 font-black mb-1 tracking-tight">Confirmar Eliminación</h5>
                  <p className="text-rose-700 dark:text-rose-400 text-xs mb-6">Esta acción borrará todas las licencias y llevará a cabo un borrado físico de datos en el backend.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar con contraseña"
                      className="flex-1 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                    />
                    <div className="flex gap-2">
                      <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1 sm:flex-none">Confirmar</Button>
                      <Button variant="primary" onClick={() => setShowDeletePrompt(false)} className="flex-1 sm:flex-none">Cancelar</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * AgenciesView
 * 
 * Componente principal de la vista de agencias.
 */
function CreateAgencyModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payload: { name: string; email?: string; password?: string; superagent?: string; admin_email?: string; admin_password?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [superagent, setSuperagent] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreated({
        name,
        email,
        password,
        superagent,
        admin_email: adminEmail,
        admin_password: adminPassword,
      });
      setName('');
      setEmail('');
      setPassword('');
      setSuperagent('');
      setAdminEmail('');
      setAdminPassword('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nueva Agencia" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {/* Section 1: Datos de la Agencia */}
        <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black">1</span>
            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Datos de la Organización</h4>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Agencia</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
              placeholder="Ej: Agencia VIP"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email de la Organización (Login Principal)</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
              placeholder="Ej: org@agencia.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contraseña de la Organización</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Section 2: Datos del Administrador */}
        <div className="p-5 rounded-2xl bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100/50 dark:border-purple-500/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-purple-500 text-white flex items-center justify-center text-xs font-black">2</span>
            <h4 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Datos del Administrador</h4>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Superagente</label>
            <input
              required
              value={superagent}
              onChange={e => setSuperagent(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
              placeholder="Ej: Carlos"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email del Administrador</label>
            <input
              required
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
              placeholder="Ej: carlos@agencia.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contraseña del Administrador</label>
            <input
              required
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
              placeholder="••••••••"
            />
          </div>
        </div>

        <Button variant="primary" loading={saving} type="submit" className="w-full !rounded-2xl py-4 font-black tracking-widest text-xs uppercase shadow-xl shadow-indigo-500/20 mt-2">
          Confirmar Registro
        </Button>
      </form>
    </Modal>
  );
}

export function AgenciesView() {
  const { agencies, licenses, loadingDeps, createAgency } = useAdminData();
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  /**
   * Obtiene el número de licencias para una agencia específica.
   */
  const getLicenseCount = (agencyId: string) =>
    licenses.filter(l => l.agency_id === agencyId).length;

  return (
    <div className="space-y-10 p-2">
      <PageHeader
        title="Gestión de Agencias"
        subtitle="Administra organizaciones, reclutadores y monitorea conversiones globales"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="px-8 whitespace-nowrap shadow-xl shadow-indigo-500/20"
            >
              <i className="fas fa-plus mr-2" />Registrar
            </Button>
          </div>
        }
      />

      {loadingDeps ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-[2rem] h-60 animate-pulse" />
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <div className="glass-card rounded-[3rem] p-24 text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300 dark:text-slate-700">
            <i className="fas fa-building text-5xl" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Sin registros</h3>
          <p className="text-slate-400 dark:text-slate-500 max-w-sm mx-auto font-medium">Registra tu primera organización para comenzar a gestionar reclutadores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {agencies.map((agency, index) => (
            <div key={agency.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <AgencyCard
                agency={agency}
                licenseCount={getLicenseCount(agency.id!)}
                onView={setSelectedAgency}
              />
            </div>
          ))}
        </div>
      )}

      <AgencyDetailModal
        agency={selectedAgency}
        onClose={() => setSelectedAgency(null)}
        onRefresh={() => setSelectedAgency(null)}
      />

      <CreateAgencyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={createAgency}
      />
    </div>
  );
}
