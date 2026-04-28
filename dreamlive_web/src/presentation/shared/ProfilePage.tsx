/**
 * Página de Perfil con layout completo:
 * - Sidebar con navegación de regreso al panel del usuario.
 * - Información personal, edición de nombre, cambio de contraseña.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useNotifications } from '../../contexts';
import { apiClient } from '../../services';
import { Sidebar, Button } from '../shared';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', programmer: 'Programador',
  owner: 'Propietario',   agent: 'Agente',
};
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',       programmer: 'bg-purple-100 text-purple-700',
  owner: 'bg-indigo-100 text-indigo-700', agent: 'bg-sky-100 text-sky-700',
};

// Íconos
const I = {
  back:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  user:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  lock:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  logout: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-5">
      <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const { user, logout, isAdminGroup } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError } = useNotifications();

  // Edición de nombre
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [saving, setSaving]     = useState(false);

  // Cambio de contraseña
  const [pw, setPw]         = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState('');

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const roleColor = ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600';
  const initials = (user.full_name || user.username)
    .split(' ').map(w => w[0] ?? '').join('').toUpperCase().substring(0, 2);
  const backPath = isAdminGroup ? '/console' : '/panel';

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.instance.patch(`/users/${user.id}`, { full_name: fullName });
      success('✓ Nombre actualizado.');
      setEditMode(false);
    } catch (e: any) {
      showError(e?.response?.data?.detail ?? 'Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) { setPwError('Las contraseñas nuevas no coinciden.'); return; }
    if (pw.next.length < 8)     { setPwError('Mínimo 8 caracteres.'); return; }
    setPwLoading(true);
    try {
      await apiClient.instance.post('/users/me/change-password', {
        current_password: pw.current,
        new_password: pw.next,
      });
      success('✓ Contraseña actualizada exitosamente.');
      setPw({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      setPwError(e?.response?.data?.detail ?? 'Error al cambiar contraseña.');
    } finally {
      setPwLoading(false);
    }
  };

  // Sidebar items para la página de perfil
  const navItems = [
    { id: 'back',     label: 'Volver al Panel', icon: I.back },
    { id: 'profile',  label: 'Mi Perfil',       icon: I.user },
    { id: 'security', label: 'Seguridad',       icon: I.lock },
  ];

  const sidebarFooter = (
    <button onClick={logout}
      className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">
      {I.logout} Cerrar sesión
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        title="DREAMLIVE"
        subtitle={isAdminGroup ? 'Console' : 'Agency'}
        items={navItems}
        activeId="profile"
        onNavigate={id => { if (id === 'back') navigate(backPath); }}
        footer={sidebarFooter}
        variant={isAdminGroup ? 'admin' : 'panel'}
      />

      <main className="md:ml-64 flex-1 p-8 min-w-0">
        <div className="max-w-2xl">
          {/* Breadcrumb */}
          <button onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium mb-6 transition-colors">
            {I.back} Volver al panel
          </button>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Mi Perfil</h2>
          <p className="text-slate-400 text-sm mb-8">Gestiona tu información personal y seguridad.</p>

          {/* Avatar + resumen */}
          <SectionCard title="Información Personal">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg leading-tight">{user.full_name || user.username}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
                <span className={`inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
            </div>

            <InfoRow label="Usuario" value={`@${user.username}`} />
            <InfoRow label="Email"   value={user.email} />
            <InfoRow label="Rol"     value={
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${roleColor}`}>{roleLabel}</span>
            } />
            <InfoRow label="Estado"  value={
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {user.status === 'active' ? '● Activo' : '● Inactivo'}
              </span>
            } />
            {user.agency_id && <InfoRow label="Agencia ID" value={`#${user.agency_id}`} />}

            <div className="mt-5 pt-4 border-t border-slate-100">
              {editMode ? (
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
                    <input
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                  <Button variant="primary" size="sm" loading={saving} onClick={handleSaveProfile}>Guardar</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setFullName(user.full_name); }}>Cancelar</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>✏️ Editar nombre</Button>
              )}
            </div>
          </SectionCard>

          {/* Cambio de contraseña */}
          <SectionCard title="Seguridad – Cambiar Contraseña">
            <form onSubmit={handleChangePassword} className="space-y-3">
              {[
                { key: 'current', label: 'Contraseña actual',  placeholder: '••••••••' },
                { key: 'next',    label: 'Nueva contraseña',   placeholder: 'Mínimo 8 caracteres' },
                { key: 'confirm', label: 'Confirmar nueva',    placeholder: '••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {f.label}
                  </label>
                  <input
                    type="password"
                    placeholder={f.placeholder}
                    value={(pw as any)[f.key]}
                    onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                    required
                  />
                </div>
              ))}
              {pwError && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{pwError}</p>
              )}
              <Button type="submit" variant="primary" size="sm" loading={pwLoading}>
                Actualizar Contraseña
              </Button>
            </form>
          </SectionCard>

          {/* Sesión */}
          <SectionCard title="Sesión">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Cerrar sesión</p>
                <p className="text-xs text-slate-400 mt-0.5">Borrará tu sesión en este dispositivo.</p>
              </div>
              <Button variant="danger" size="sm" onClick={logout}>Cerrar Sesión</Button>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
