/**
 * ProfilesView – Gestión de perfiles de usuario de la agencia.
 * Agency Admin: puede invitar y asignar roles (menos superuser).
 * Superuser: ídem para cualquier agencia.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PageHeader, Button, Badge } from '../../shared';
import { UsersAdapter } from '../../../services';
import { useNotifications, useAuth } from '../../../contexts';
import type { ProfileUser } from '../../../core/entities/settings';

const ALLOWED_ROLES = ['agency_admin', 'agent'];
const ROLE_LABELS: Record<string, string> = {
  superuser: 'ADMINISTRADOR',
  agency_admin: 'GERENTE',
  agent: 'AGENTE',
};
const ROLE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  superuser: 'blue',
  agency_admin: 'green',
  agent: 'yellow',
};

import { http } from '../../../services/http/apiClient';

// ─── Modal Invitar / Editar ───────────────────────────────────────────────────
function UserFormModal({
  user,
  open,
  onClose,
  onSaved,
}: {
  user: ProfileUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { success, error } = useNotifications();
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState('agent');
  const [saving, setSaving] = useState(false);
  const [licenses, setLicenses] = useState<{ id: string; key: string; recruiter_name?: string }[]>([]);
  const [selectedLicense, setSelectedLicense] = useState('');
  const isEdit = Boolean(user);

  useEffect(() => {
    if (user) {
      setUsername(user.username); setFullName(user.full_name || '');
      setEmail(user.email); setRole(user.role);
      setPassword(''); setPasswordConfirm('');
      setLicenses([]); setSelectedLicense('');
    } else {
      setUsername(''); setFullName(''); setEmail(''); setRole('agent'); setPassword(''); setPasswordConfirm('');
      if (open) {
        http.get('/licenses/unassigned').then(({ data }) => {
          setLicenses(data);
          if (data.length > 0) setSelectedLicense(data[0].id);
          else setSelectedLicense('');
        }).catch(() => {
          setLicenses([]); setSelectedLicense('');
        });
      }
    }
  }, [user, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== passwordConfirm) {
      error('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && user) {
        const payload: any = {
          username,
          full_name: fullName,
          email,
          role,
          agency_id: user.agency_id || currentUser?.agency_id
        };
        if (password) payload.password = password;
        await UsersAdapter.update(user.id, payload);
        success('Acceso web configurado correctamente.');
      } else {
        await UsersAdapter.create({
          username,
          full_name: fullName,
          email,
          password,
          role,
          agency_id: currentUser?.agency_id,
          license_id: selectedLicense
        });
        success('Usuario creado y acceso concedido.');
      }
      onSaved(); onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al procesar la solicitud.';
      error(msg);
    }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-0 overflow-hidden z-10 animate-scale-in border-2 border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800 px-8 py-7 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase">
            {isEdit ? 'Configurar Acceso Web' : 'Cifrar Nueva Cuenta'}
          </h2>
          <button type="button" onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white transition-all flex items-center justify-center active:scale-90">
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="px-8 pt-6">
          <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse">
            <i className="fas fa-info-circle mr-2" />
            Termina de rellenar este formulario para que este usuario pueda loguearse
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-7 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] block mb-3 ml-1">Alias de Usuario</label>
              <div className="relative group">
                <i className="fas fa-at absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 transition-colors group-focus-within:text-indigo-400" />
                <input required value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-white/10"
                  placeholder="ej: jack.dream" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] block mb-3 ml-1">E-Mail Seguro</label>
              <div className="relative group">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 transition-colors group-focus-within:text-indigo-400" />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-white/10"
                  placeholder="admin@cyber.com" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] block mb-3 ml-1">Nombre Legal / Identidad</label>
            <div className="relative group">
              <i className="fas fa-fingerprint absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 transition-colors group-focus-within:text-indigo-400" />
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-white/10"
                placeholder="Nombre completo" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] block mb-3 ml-1">
              Criptografía de Acceso {isEdit && '(Opcional)'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative group">
                <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 transition-colors group-focus-within:text-indigo-400" />
                <input required={!isEdit} type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-white/10"
                  placeholder={isEdit ? "Dejar en blanco para mantener" : "••••••••••••"} />
              </div>
              <div className="relative group">
                <i className="fas fa-check-double absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 transition-colors group-focus-within:text-indigo-400" />
                <input required={!isEdit || password.length > 0} type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-white/10"
                  placeholder="Confirmar contraseña" />
              </div>
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] block mb-3 ml-1">Licencia Disponible</label>
              <div className="relative group">
                <i className="fas fa-id-card absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 group-focus-within:text-indigo-400" />
                <select
                  required
                  value={selectedLicense}
                  onChange={e => setSelectedLicense(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236366f1%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat transition-all font-black uppercase text-[11px] tracking-widest cursor-pointer"
                >
                  <option value="">Selecciona una licencia</option>
                  {licenses.map(l => (
                    <option key={l.id} value={l.id} className="text-slate-900 bg-white">
                      {l.key} {l.recruiter_name ? `(${l.recruiter_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {licenses.length === 0 && (
                <p className="text-[10px] text-rose-500 font-bold mt-2 ml-1 uppercase">No hay licencias disponibles. Solicita una Primero.</p>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-white/30 uppercase tracking-[0.2em] block mb-3 ml-1">Nivel de Autorización</label>
            <div className="relative group">
              <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 group-focus-within:text-indigo-400" />
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236366f1%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat transition-all font-black uppercase text-[11px] tracking-widest cursor-pointer">
                {ALLOWED_ROLES.map(r => (
                  <option key={r} value={r} className="text-slate-900 bg-white">{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          <Button variant="primary" className="w-full py-5 rounded-2xl font-black shadow-2xl shadow-indigo-600/20 mt-8 text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]" loading={saving} type="submit" disabled={!isEdit && !selectedLicense}>
            {isEdit ? 'Ejecutar Actualización' : 'Instanciar Nueva Cuenta'}
            <i className="fas fa-bolt text-indigo-400" />
          </Button>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export function ProfilesView() {
  const { role: rawRole, user: currentUser } = useAuth();
  const myRole = rawRole?.toLowerCase();
  const { error } = useNotifications();
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProfileUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [globalView, setGlobalView] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data = await UsersAdapter.list();

      // Strict isolation: Even for superusers, show local agency by default in "Settings" context
      // only if globalView is false and the user has an agency association
      if (!globalView && currentUser?.agency_id) {
        data = data.filter(u => u.agency_id === currentUser.agency_id);
      }

      setUsers(data);
    }
    catch { error('Error cargando perfiles.'); }
    finally { setLoading(false); }
  }, [error, globalView, currentUser?.agency_id]);

  useEffect(() => { load(); }, [load]);

  // Delete functionality removed as it deletes the whole license
  // const handleDelete = ...

  return (
    <div className="space-y-8 animate-fade-in p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-2">
            Gestión de Personal
          </h1>
          <p className="text-muted-foreground font-medium">Administra los accesos y roles de tu equipo de trabajo.</p>
        </div>
        <div className="flex items-center gap-4">
          {myRole === 'superuser' && (
            <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-2xl border border-border mr-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Vista Global</span>
              <button
                onClick={() => setGlobalView(!globalView)}
                className={`w-10 h-6 rounded-full transition-all relative ${globalView ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${globalView ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}
          {(myRole === 'superuser' || myRole === 'agency_admin') && (
            <Button variant="primary" onClick={() => { setSelected(null); setShowForm(true); }} className="!rounded-2xl !py-4 !px-8 font-black uppercase text-xs shadow-xl shadow-indigo-500/20">
              <i className="fas fa-user-plus mr-2" /> Agregar Usuario
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-muted-foreground font-black uppercase text-xs tracking-widest">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin mr-3" />
            Sincronizando perfiles...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                <th className="px-6 py-4 text-left">Identidad</th>
                <th className="px-6 py-4 text-left">Contacto</th>
                {myRole === 'superuser' && <th className="px-6 py-4 text-left">Agencia</th>}
                <th className="px-6 py-4 text-left">Privilegios</th>
                <th className="px-6 py-4 text-left">Estado</th>
                {(myRole === 'superuser' || myRole === 'agency_admin') && (
                  <th className="px-6 py-4 text-right">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={myRole === 'superuser' ? 6 : 5} className="py-20 text-center text-muted-foreground italic font-medium">
                    <i className="fas fa-users-slash text-4xl block mb-4 opacity-20" /> No se encontraron cuentas en este segmento.
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm tracking-tight">{u.username}</p>
                        {u.full_name && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{u.full_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground/80 font-medium">{u.email}</td>
                  {myRole === 'superuser' && (
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
                        {u.agency_id ? u.agency_id.slice(0, 8) : 'SISTEMA'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <Badge variant={ROLE_COLORS[u.role?.toLowerCase()] ?? 'gray'}>
                      {ROLE_LABELS[u.role?.toLowerCase()] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.status === 'active' ? 'green' : u.status === 'pending' ? 'yellow' : 'gray'}>
                      {u.status === 'active' ? 'Activo' : u.status === 'pending' ? 'Pendiente' : 'Inactivo'}
                    </Badge>
                  </td>
                  {(myRole === 'superuser' || myRole === 'agency_admin') && u.role !== 'superuser' && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(myRole?.toLowerCase() === 'superuser' || (u.id !== currentUser?.id && u.role?.toLowerCase() !== myRole?.toLowerCase())) && (
                          <Button size="sm" variant="outline" onClick={() => { setSelected(u); setShowForm(true); }} className="!rounded-xl border-border hover:bg-card">
                            <i className="fas fa-pen mr-2 text-[10px]" /> Gestionar
                          </Button>
                        )}

                        {u.id !== currentUser?.id && (!u.email || u.status !== 'active') && (myRole === 'superuser' || (myRole === 'agency_admin' && u.role === 'agent')) && (
                          <Button size="sm" variant="outline" onClick={() => { setSelected(u); setShowForm(true); }} className="!rounded-xl border-indigo-500/30 hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">
                            <i className="fas fa-key mr-2 text-[10px]" /> Conceder acceso a web
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserFormModal
        user={selected}
        open={showForm}
        onClose={() => { setShowForm(false); setSelected(null); }}
        onSaved={load}
      />
    </div>
  );
}
