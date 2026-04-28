import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts';
import { clsx } from 'clsx';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  onNavigate: (id: string) => void;
}

export function AdminLayout({ children, activeMenu, onNavigate }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Carga dinámica del CSS de Admin
  useEffect(() => {
    const link = document.createElement('link');
    link.href = '/admin-theme.css';
    link.rel = 'stylesheet';
    link.id = 'admin-theme';
    document.head.appendChild(link);
    return () => { document.getElementById('admin-theme')?.remove(); };
  }, []);

  const menuItems = [
    { id: 'overview', icon: 'fa-chart-pie', text: 'Vista General' },
    { id: 'licenses', icon: 'fa-key', text: 'Licencias' },
    { id: 'agencies', icon: 'fa-building', text: 'Agencias' },
    { id: 'updates', icon: 'fa-cloud-arrow-up', text: 'Actualizaciones' }
  ];

  return (
    <div className="admin-portal min-h-screen flex w-full">
      {/* Botón Hamburger (Mobile) */}
      <button 
        className="hamburger md:hidden fixed top-4 right-4 z-[60] bg-white rounded p-2 shadow" 
        onClick={() => setSidebarOpen(true)}
      >
        <i className="fas fa-bars text-xl text-slate-800"></i>
      </button>

      {/* Overlay Sidebar (Mobile) */}
      <div 
        className={clsx(
          "sidebar-overlay md:hidden fixed inset-0 bg-slate-900/50 z-40 transition-opacity", 
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar Responsive */}
      <aside 
        className={clsx(
          "sidebar fixed md:relative z-50 h-screen transition-transform duration-300 w-64 flex-shrink-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="brand p-6 border-b border-white/10 flex items-center gap-3">
          <i className="fa-solid fa-layer-group text-2xl"></i>
          <h1 className="text-xl font-bold tracking-tight">
            DREAMLIVE<span className="font-light opacity-70">CONSOLE</span>
          </h1>
        </div>

        <nav className="menu flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map(m => (
            <div 
              key={m.id} 
              className={clsx(
                "menu-item px-4 py-3 rounded-lg cursor-pointer flex items-center gap-3 transition-colors",
                activeMenu === m.id ? "active bg-white/10 text-white font-semibold" : "text-slate-300 hover:bg-white/5 hover:text-white"
              )} 
              onClick={() => { onNavigate(m.id); setSidebarOpen(false); }}
            >
              <i className={clsx("fa-solid w-5 text-center", m.icon)}></i> 
              <span>{m.text}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer p-4 border-t border-white/10">
          <div 
            className="status-badge mb-2 cursor-pointer flex items-center justify-center gap-2 py-2 px-3 rounded text-sm text-red-600 bg-red-100 hover:bg-red-200 transition-colors" 
            onClick={logout}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
          </div>
          <div className="status-badge flex justify-center items-center gap-2 py-2 text-sm text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
            Online - {user?.username}
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main flex-1 w-full max-w-full overflow-x-hidden pt-16 md:pt-6 p-4 md:p-8 bg-slate-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
