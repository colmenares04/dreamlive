import React from 'react';
import { LogOut, LayoutDashboard, Settings, User as UserIcon, ShieldCheck } from 'lucide-react';
import { User, License } from '../../../infrastructure/api/auth.service';

interface DashboardPlaceholderProps {
  user: User | null;
  license: License | null;
  onLogout: () => void;
}

export const DashboardPlaceholder: React.FC<DashboardPlaceholderProps> = ({ user, license, onLogout }) => {
  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">DreamLive</h1>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Welcome Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <UserIcon size={24} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-slate-100">
              ¡Bienvenido, {user?.username || 'Administrador'}!
            </h2>
            <p className="text-sm text-slate-500">{user?.email || 'Sesión por licencia'}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span className="text-sm text-slate-300">Licencia Activa</span>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {license?.key || 'DL-PREMIUM-XXXX'}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group">
          <div className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-blue-600/20">
            <Settings size={20} className="text-slate-400 group-hover:text-blue-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-200">Configuración</h3>
          <p className="text-xs text-slate-500 mt-1">Ajustes de la extensión</p>
        </div>
        
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group">
          <div className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-emerald-600/20">
            <LayoutDashboard size={20} className="text-slate-400 group-hover:text-emerald-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-200">Métricas</h3>
          <p className="text-xs text-slate-500 mt-1">Reportes de actividad</p>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Sistema en línea • v1.2.0
        </span>
      </div>
    </div>
  );
};
