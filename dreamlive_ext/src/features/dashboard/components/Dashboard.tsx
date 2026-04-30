import React, { useState } from 'react';
import { 
  LogOut, 
  LayoutDashboard, 
  Settings, 
  User as UserIcon, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Eye, 
  EyeOff, 
  Monitor, 
  Clock,
  Terminal,
  Activity,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Badge, Button } from '../../../shared/components/ui';
import { OperationsConsole } from '../../operations/components/OperationsConsole';

export const Dashboard: React.FC = () => {
  const { user, license, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'ops'>('profile');
  const [showKey, setShowKey] = useState(false);

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'AD';

  return (
    <div className="w-full min-h-full flex flex-col bg-white dark:bg-[#0d1117] transition-colors duration-300 animate-in fade-in duration-500">
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between bg-gray-50 dark:bg-[#161b22]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#175DDC] dark:bg-[#238636] flex items-center justify-center shadow-sm">
            <Terminal size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">DreamLive</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase tracking-tighter">Enterprise v1.2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-[#30363d] text-gray-600 dark:text-gray-400 transition-all"
            title="Cambiar Tema"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button 
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* User Info Bar */}
      <div className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-[#0d1117] border-b border-gray-100 dark:border-[#30363d]/50">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-[#238636] dark:to-[#2ea043] flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {user?.username || 'Administrador'}
          </h2>
          <div className="flex items-center gap-1.5">
            <Badge variant={user?.role === 'superuser' ? 'indigo' : 'gray'} className="text-[9px] px-1 py-0 uppercase tracking-tighter">
              {user?.role || 'Agente'}
            </Badge>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.email || 'Sesión Activa'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex px-4 pt-2 gap-4 border-b border-gray-100 dark:border-[#30363d]/50">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`pb-2 text-xs font-medium transition-all relative ${activeTab === 'profile' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Perfil y Licencia
          {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#175DDC] dark:bg-[#f78166] rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('ops')}
          className={`pb-2 text-xs font-medium transition-all relative ${activeTab === 'ops' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Consola Operativa
          {activeTab === 'ops' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#175DDC] dark:bg-[#f78166] rounded-t-full" />}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'profile' ? (
          <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
            {/* License Card */}
            <div className="rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#161b22]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500 dark:text-[#3fb950]" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">Estado de Suscripción</span>
                </div>
                <Badge variant="green" className="text-[10px]">ACTIVA</Badge>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Key Field */}
                <div>
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-widest mb-1.5 block">Clave Corporativa</label>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d]">
                    <code className="text-xs font-mono font-bold text-blue-600 dark:text-[#58a6ff]">
                      {showKey ? (license?.key || 'DL-PREMIUM-2026-X') : '••••-••••-••••-••••'}
                    </code>
                    <button 
                      onClick={() => setShowKey(!showKey)} 
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-[#30363d]/50 bg-gray-50/30 dark:bg-[#0d1117]/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Vencimiento</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {license?.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '31/12/2026'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-[#30363d]/50 bg-gray-50/30 dark:bg-[#0d1117]/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Monitor size={12} className="text-gray-400" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Sesiones</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      1 / {license?.max_devices || 5}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="text-xs h-10 border-gray-200 dark:border-[#30363d] dark:hover:bg-[#30363d]">
                <Settings size={14} className="mr-2" />
                Ajustes
              </Button>
              <Button variant="outline" className="text-xs h-10 border-gray-200 dark:border-[#30363d] dark:hover:bg-[#30363d]">
                <Activity size={14} className="mr-2" />
                Métricas
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full animate-in slide-in-from-right-4 duration-300">
            <OperationsConsole />
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="px-4 py-2 border-t border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 font-bold text-gray-500 dark:text-[#8b949e]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" />
          ONLINE
        </div>
        <a href="#" className="flex items-center gap-1 text-blue-600 dark:text-[#58a6ff] hover:underline font-bold">
          Soporte <ExternalLink size={10} />
        </a>
      </footer>
    </div>
  );
};
