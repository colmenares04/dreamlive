import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts';
import { clsx } from 'clsx';

interface AgencyLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  onNavigate: (id: string) => void;
}

export function AgencyLayout({ children, activeMenu, onNavigate }: AgencyLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Carga dinámica del CSS de Agencia
  useEffect(() => {
    const link = document.createElement('link');
    link.href = '/agency-theme.css';
    link.rel = 'stylesheet';
    link.id = 'agency-theme';
    document.head.appendChild(link);
    return () => { document.getElementById('agency-theme')?.remove(); };
  }, []);

  const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', text: 'Dashboard' },
    { id: 'leads', icon: 'fa-address-book', text: 'Global Leads' },
    { id: 'team', icon: 'fa-users-cog', text: 'Team Manager' }
  ];

  return (
    <div id="app" className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased">
      {/* Botón Hamburger (Mobile) */}
      <button 
        className="md:hidden fixed top-4 right-4 z-[60] bg-white rounded-lg p-2.5 shadow-md border border-slate-200" 
        onClick={() => setSidebarOpen(true)}
      >
        <i className="fas fa-bars text-lg text-slate-800"></i>
      </button>

      {/* Overlay Sidebar (Mobile) */}
      <div 
        className={clsx(
          "md:hidden fixed inset-0 bg-transparent z-40 transition-opacity", 
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar Responsive */}
      <aside 
        className={clsx(
          "fixed md:relative z-50 h-screen transition-transform duration-300 w-[260px] flex-shrink-0 flex flex-col bg-white border-r border-[#e2e8f0] shadow-[0_4px_24px_rgba(0,0,0,0.02)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 text-indigo-600 mb-6">
            <i className="fas fa-layer-group text-2xl"></i>
            <span className="text-xl font-black tracking-tight" style={{ color: 'var(--primary)' }}>DREAMLIVE</span>
          </div>
          <div className="text-center bg-slate-50 border border-slate-100 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Agencia Activa</div>
            <div className="font-bold text-slate-700 text-sm">{user?.username}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 mt-4">
          {menuItems.map(m => (
            <div 
              key={m.id} 
              className={clsx(
                "px-4 py-3 rounded-xl cursor-pointer flex items-center gap-3 transition-colors text-[13px] font-bold",
                activeMenu === m.id 
                  ? "bg-indigo-50 text-indigo-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )} 
              onClick={() => { onNavigate(m.id); setSidebarOpen(false); }}
            >
              <i className={clsx("fas w-5 text-center text-[15px]", m.icon)}></i> 
              {m.text}
            </div>
          ))}
        </nav>

        <div className="p-6 pt-0">
          <button 
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-[#fecdd3] text-[#be123c] hover:bg-[#fff1f2] transition-colors" 
            onClick={logout}
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden pt-20 md:pt-8 p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
