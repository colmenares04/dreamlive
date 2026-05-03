/**
 * DashboardLayout.tsx
 * 
 * Layout principal para las secciones de Administrador y Agencia.
 * Incluye barra lateral responsiva, navegación unificada, gestión de temas
 * y protectores de ruta por rol.
 */
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useTheme } from '../../../contexts';
import { useAgencyPermissions } from '../../../hooks/useAgencyPermissions';
import { clsx } from 'clsx';
import { UserPermissions } from '../../../core/entities';

/**
 * DashboardLayout
 * 
 * Envuelven las vistas del dashboard en un contenedor con sidebar persistente
 * en desktop y tipo "drawer" en mobile. Utiliza Glassmorphism para los menús.
 * 
 * @returns {JSX.Element}
 */
export function DashboardLayout() {
  const { user, role: rawRole, logout } = useAuth();
  const role = rawRole?.toLowerCase();
  const { isDark, toggleTheme } = useTheme();
  const { permissions } = useAgencyPermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Finaliza la sesión y redirige al login.
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determinar permisos de menú basado en rol y configuración dinámica
  const showAdminMenu = role ? UserPermissions.isAdminGroup(role) : false;
  const showAgencyMenu = role ? UserPermissions.isAgencyGroup(role) || UserPermissions.isAdminGroup(role) : false;

  // Permisos específicos dinámicos
  const canManageTeam = role ? UserPermissions.canManageTeam(role, permissions || undefined) : false;
  const canManageLicenses = role ? UserPermissions.canManageLicenses(role, permissions || undefined) : false;
  const canViewMetrics = role ? UserPermissions.canViewMetrics(role, permissions || undefined) : false;

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans antialiased text-foreground transition-colors duration-300">
      
      {/* Botón Hamburger (Mobile) */}
      <button 
        className="md:hidden fixed top-6 right-6 z-[60] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl text-foreground active:scale-95 transition-all" 
        onClick={() => setSidebarOpen(true)}
      >
        <i className="fas fa-bars text-xl"></i>
      </button>

      {/* Overlay Sidebar (Mobile) */}
      <div 
        className={clsx(
          "md:hidden fixed inset-0 bg-transparent z-40 transition-opacity duration-500", 
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar Unificado con Glassmorphism */}
      <aside 
        className={clsx(
          "fixed md:relative z-50 h-screen transition-all duration-500 ease-in-out w-[280px] flex-shrink-0 flex flex-col bg-slate-950 text-slate-300 shadow-2xl border-r border-white/5",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand Section */}
        <div className="p-8 border-b border-white/5 space-y-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <i className="fas fa-layer-group text-xl text-white"></i>
            </div>
            <span className="text-xl font-black tracking-tighter">
              DREAM<span className="text-indigo-400">LIVE</span>
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shimmer-mask shadow-inner">
            <div className="text-[10px] uppercase font-black text-indigo-400 mb-1 tracking-widest">Sesión Activa</div>
            <div className="font-bold text-white text-base truncate tracking-tight">{user?.username}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
              <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest leading-none">
                {role?.toLowerCase() === 'superuser' ? 'ADMINISTRADOR' : role?.toLowerCase() === 'agency_admin' ? 'GERENTE' : role?.toLowerCase() === 'agent' || role?.toLowerCase() === 'recruiter' ? 'AGENTE' : String(role).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
          
          {/* SECCIÓN: ADMINISTRADOR */}
          {showAdminMenu && (
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Administrador
              </div>
              <div className="space-y-1">
                <MenuLink to="/dashboard/admin/overview" icon="fa-chart-pie" text="Vista General" onClick={() => setSidebarOpen(false)} />
                <MenuLink to="/dashboard/admin/licenses" icon="fa-key" text="Licencias" onClick={() => setSidebarOpen(false)} />
                <MenuLink to="/dashboard/admin/agencies" icon="fa-building" text="Agencias" onClick={() => setSidebarOpen(false)} />
                <MenuLink to="/dashboard/admin/updates" icon="fa-cloud-arrow-up" text="Actualizaciones" onClick={() => setSidebarOpen(false)} />
                <MenuLink to="/dashboard/admin/notifications" icon="fa-bell" text="Notificaciones" onClick={() => setSidebarOpen(false)} />
                <MenuLink to="/dashboard/settings/ticket-support" icon="fa-headset" text="Gestión Tickets" onClick={() => setSidebarOpen(false)} />
                <MenuLink to="/dashboard/settings/audit" icon="fa-shield-alt" text="Auditoría" onClick={() => setSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* SECCIÓN: AGENCIA */}
          {showAgencyMenu && (
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Agencia
              </div>
              <div className="space-y-1">
                {(canViewMetrics || role === 'agent') && <MenuLink to="/dashboard/agency/overview" icon="fa-chart-line" text="Dashboard Agencia" onClick={() => setSidebarOpen(false)} />}
                {role !== 'agent' && <MenuLink to="/dashboard/agency/leads" icon="fa-address-book" text="Global Leads" onClick={() => setSidebarOpen(false)} />}
                {role === 'agent' && <MenuLink to="/dashboard/agency/my-leads" icon="fa-address-card" text="Panel de Leads" onClick={() => setSidebarOpen(false)} />}
                {canManageTeam && <MenuLink to="/dashboard/agency/team" icon="fa-users-cog" text="Team Manager" onClick={() => setSidebarOpen(false)} />}
                {canManageLicenses && <MenuLink to="/dashboard/agency/licenses" icon="fa-key" text="Mis Licencias" onClick={() => setSidebarOpen(false)} />}
                <MenuLink to="/dashboard/agency/notifications" icon="fa-bell" text="Notificaciones" onClick={() => setSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* SECCIÓN: CONFIGURACIÓN */}
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              Configuración
            </div>
            <div className="space-y-1">
              {role !== 'agent' && <MenuLink to="/dashboard/settings/profiles" icon="fa-users" text="Perfiles" onClick={() => setSidebarOpen(false)} />}
              <MenuLink to="/dashboard/settings/account" icon="fa-user-circle" text="Mi Cuenta" onClick={() => setSidebarOpen(false)} />
              <MenuLink to="/dashboard/settings/support" icon="fa-headset" text="Soporte" onClick={() => setSidebarOpen(false)} />
              <MenuLink to="/dashboard/settings/updates" icon="fa-cloud-download-alt" text="Actualización" onClick={() => setSidebarOpen(false)} />
              {/* Opción Elegante y Hermosa de Roles (Desactivada temporalmente) */}
              {/* {role === 'agency_admin' && (
                <MenuLink to="/dashboard/settings/roles" icon="fa-user-shield" text="Roles y Permisos" onClick={() => setSidebarOpen(false)} />
              )} */}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer with Theme Toggle */}
        <div className="p-6 border-t border-white/5 space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 transition-all group"
          >
            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              Tema {isDark ? 'Oscuro' : 'Claro'}
            </span>
            <div className="w-10 h-5 bg-slate-800 rounded-full relative p-1 flex items-center">
              <div className={clsx(
                "w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                isDark ? "translate-x-5 bg-indigo-400" : "translate-x-0 bg-amber-400"
              )}>
                <i className={clsx("fas text-[6px] text-slate-900 flex items-center justify-center h-full", isDark ? 'fa-moon' : 'fa-sun')}></i>
              </div>
            </div>
          </button>

          <button 
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300" 
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 overflow-y-auto pt-24 md:pt-10 p-6 md:p-10 custom-scrollbar relative">
        <div className="max-w-[1400px] mx-auto w-full animate-fade-in">
          <Outlet />
        </div>
        
        {/* Subtle background glow decorator */}
        <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      </main>
    </div>
  );
}

/**
 * Enlace de navegación interactivo con estilos premium.
 */
function MenuLink({ to, icon, text, onClick }: { to: string, icon: string, text: string, onClick: () => void }) {
  return (
    <NavLink 
      to={to}
      onClick={onClick}
      className={({ isActive }) => clsx(
        "px-4 py-3.5 rounded-2xl flex items-center gap-4 text-[13px] font-bold transition-all duration-300 group",
        isActive 
          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      )}
    >
      <i className={clsx(
        "fas w-5 text-center text-sm transition-transform duration-300 group-hover:scale-110", 
        icon
      )}></i> 
      <span className="tracking-tight">{text}</span>
    </NavLink>
  );
}
