/**
 * AccountView – Configuración de la cuenta del usuario actual.
 * Disponible para todos los roles.
 */
import React, { useState } from 'react';
import { PageHeader, Button, Badge } from '../../shared';
import { useAuth, useNotifications } from '../../../contexts';
import { UsersAdapter } from '../../../services';

export function AccountView() {
  const { user } = useAuth();
  const { success, error } = useNotifications();

  const [username, setUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Sync state if user changes
  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
      setFullName(user.full_name || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await UsersAdapter.update(user.id, { username, full_name: fullName });
      success('Perfil actualizado correctamente.');
    } catch { error('Error al actualizar el perfil.'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPassword) { error('Ingresa una nueva contraseña.'); return; }
    if (newPassword !== confirmPassword) { error('Las contraseñas no coinciden.'); return; }

    setChangingPass(true);
    try {
      await UsersAdapter.update(user.id, { password: newPassword });
      success('Contraseña actualizada con éxito.');
      setNewPassword('');
      setConfirmPassword('');
    } catch { error('Error al cambiar la contraseña.'); }
    finally { setChangingPass(false); }
  };

  const roleLabels: Record<string, string> = {
    superuser: 'ADMINISTRADOR',
    agency_admin: 'GERENTE',
    agent: 'AGENTE',
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <PageHeader
        title="Mi Perfil Administrativo"
        subtitle="Configuración de identidad, seguridad y parámetros de sesión"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Lado Izquierdo: Formuarios (2/3) */}
        <div className="xl:col-span-2 space-y-8">

          {/* Avatar / Banner Premium */}
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full -ml-32 -mb-32 blur-[60px]" />

            <div className="relative flex flex-col md:flex-row items-center gap-10">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-black shadow-2xl shadow-indigo-500/40 ring-4 ring-white/10 group-hover:scale-105 transition-transform duration-500">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-slate-900 rounded-full flex items-center justify-center text-white text-xs shadow-lg">
                  <i className="fas fa-shield-check" />
                </div>
              </div>

              <div className="text-center md:text-left space-y-2">
                <Badge variant="indigo" className="bg-white/10 border-white/10 text-indigo-300 uppercase tracking-[0.3em] font-black !px-4 !py-1 text-[10px]">
                  {roleLabels[user?.role?.toLowerCase() ?? ''] ?? user?.role}
                </Badge>
                <h2 className="text-4xl font-black tracking-tighter leading-none">{user?.username}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-2"><i className="fas fa-envelope text-indigo-400" /> {user?.email}</span>
                  <span className="flex items-center gap-2"><i className="fas fa-id-badge text-purple-400" /> ID: {user?.id.substring(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Perfil */}
            <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-10 shadow-sm glass-card">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                  <i className="fas fa-user-circle text-xl" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Datos de Identidad</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Información Base</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Alias de Sistema</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nombre Completo</label>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <Button variant="primary" loading={saving} type="submit" className="!rounded-2xl py-4 px-8 shadow-xl shadow-indigo-500/20">
                  Guardar Perfil
                </Button>
              </form>
            </div>

            {/* Seguridad */}
            <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-10 shadow-sm glass-card">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner">
                  <i className="fas fa-lock-alt text-xl" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Ciberseguridad</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rotación de Claves</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-rose-500/10 outline-none transition-all dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Confirmar Nueva</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-rose-500/10 outline-none transition-all dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
                <Button variant="outline" loading={changingPass} type="submit" className="w-full !rounded-2xl py-4 border-slate-200 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-colors">
                  Actualizar Acceso
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Centro de Comando (1/3) */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-lg shadow-indigo-500/5">
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative">
              <h3 className="text-xl font-black italic tracking-tighter uppercase">Centro de Comando</h3>
              <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-1">Estatus del Operador</p>
              <i className="fas fa-microchip absolute top-8 right-8 text-4xl text-white/10" />
            </div>
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Parámetros de Red</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase">Nodo Origen</span>
                    <span className="text-xs font-black text-indigo-500 font-mono">dreamlive.app</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase">Encriptación</span>
                    <span className="text-xs font-black text-emerald-500 uppercase">AES-256</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase">Agencia Auth</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">{user?.agency_id?.substring(0, 12) ?? 'SISTEMA'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pulso de Sesión</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-indigo-500 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-500 uppercase">Online</span>
                </div>
                <p className="text-[9px] text-slate-400 font-medium mt-2 italic text-center">Conexión establecida vía WebSocket Seguros</p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-amber-50 dark:bg-amber-500/5 rounded-[2.5rem] border border-amber-200/50 dark:border-amber-500/20 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
              <i className="fas fa-info-circle text-xl" />
            </div>
            <h4 className="text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-tighter">Acerca de tu Rol</h4>
            <p className="text-[11px] text-amber-700/70 dark:text-amber-500/50 leading-relaxed font-bold">
              Tu nivel de acceso te permite gestionar {user?.role === 'superuser' ? 'todo el ecosistema' : 'la operación de tu agencia'}. Usa tu contraseña con responsabilidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
