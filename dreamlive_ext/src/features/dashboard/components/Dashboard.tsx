import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogOut,
  Moon,
  Sun,
  Eye,
  EyeOff,
  ExternalLink,
  Bell,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Badge, Button } from '../../../shared/components/ui';
import { OperationsConsole } from '../../operations/components/OperationsConsole';
import { AuthService } from '../../../infrastructure/api/auth.service';
import { apiClient } from '../../../infrastructure/api/apiClient';

interface NotifItem {
  id: string;
  title: string;
  description_ext: string;
  created_at: string | null;
  image: string | null;
}

const WEB_URL = 'http://217.216.94.178';

export const Dashboard: React.FC = () => {
  const { user, license, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'ops'>('profile');
  const [showKey, setShowKey] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<{ limite_diario: number; usados_hoy: number; tiempo_para_reinicio: number } | null>(null);

  // Notifications state
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchMe = async () => {
    try {
      const res = await AuthService.getMe();
      if (res && res.data) {
        setDailyUsage({
          limite_diario: res.data.limite_diario || 60,
          usados_hoy: res.data.usados_hoy || 0,
          tiempo_para_reinicio: res.data.tiempo_para_reinicio || 0,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch notifications via polling
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get<NotifItem[]>('/notifications/latest');
      if (res.data) {
        setNotifications(res.data);
      }
      const countRes = await apiClient.get<{ unread: number }>('/notifications/unread-count');
      if (countRes.data) {
        setUnreadCount(countRes.data.unread);
      }
    } catch (e) {
      console.error('[Notifications] Error fetching:', e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchMe();
      const interval = setInterval(fetchMe, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Poll notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (notifId: string) => {
    apiClient.post(`/notifications/${notifId}/read`).catch(() => { });
    window.open(`${WEB_URL}/dashboard/agency/notifications`, '_blank');
    setShowNotifs(false);
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days}d`;
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs} horas y ${mins} minutos`;
  };

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'AD';

  return (
    <div className="w-full min-h-full flex flex-col bg-[#F5F5F7] dark:bg-[#000000] text-gray-900 dark:text-gray-100 transition-colors duration-300 animate-in fade-in">

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between relative bg-white dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/5 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--color-apple-green)] to-[#A2F0B3] flex items-center justify-center text-white text-lg font-medium shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-semibold tracking-tight text-gray-900 dark:text-white leading-tight">
              {user?.username || 'Administrador'}
            </h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {user?.email || 'Sesión Activa'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(WEB_URL, '_blank')}
            className="p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-gray-400"
            title="Ir a la web"
          >
            <ExternalLink size={16} strokeWidth={1.5} />
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(prev => !prev)}
              className="p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-gray-400 relative"
              title="Notificaciones"
            >
              <Bell size={16} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 border-2 border-white dark:border-[#1C1C1E] text-[9px] text-white font-bold px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown — Apple-style */}
            {showNotifs && (
              <div className="absolute right-0 top-12 w-72 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-[100] overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
                  <span className="text-[14px] font-semibold text-gray-900 dark:text-white">Notificaciones</span>
                  <button onClick={() => setShowNotifs(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                      <p className="text-[12px] text-gray-400">Sin notificaciones</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n.id)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-black/3 dark:border-white/3 last:border-0"
                      >
                        {n.image ? (
                          <img src={`http://217.216.94.178:8000${n.image}`} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                            <Bell size={16} className="text-indigo-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{n.title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-snug mt-0.5">{n.description_ext}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatTimeAgo(n.created_at)}</p>
                        </div>
                        <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 mt-1 flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <button
                    onClick={() => { window.open(`${WEB_URL}/dashboard/agency/notifications`, '_blank'); setShowNotifs(false); }}
                    className="w-full py-2.5 text-center text-[12px] font-semibold text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors border-t border-black/5 dark:border-white/5"
                  >
                    Ver todas las notificaciones
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-gray-400"
            title="Tema"
          >
            {theme === 'light' ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-gray-500 dark:text-gray-400 hover:text-red-500"
            title="Cerrar Sesión"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Segmented Control */}
      <div className="px-4 pb-2">
        <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[10px]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[7px] transition-all duration-200 ${activeTab === 'profile'
                ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            Suscripción
          </button>
          <button
            onClick={() => setActiveTab('ops')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[7px] transition-all duration-200 ${activeTab === 'ops'
                ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            Operaciones
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {activeTab === 'profile' ? (
          <div className="space-y-4 animate-in fade-in duration-300 pt-2">

            {/* License Card */}
            <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-sm border border-black/5 dark:border-white/5">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[15px] font-semibold tracking-tight">Detalles de Licencia</span>
                <span className="text-[12px] font-medium text-[var(--color-apple-green)] bg-[var(--color-apple-green)]/10 px-2 py-0.5 rounded-full">Activa</span>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="text-[12px] text-gray-500 dark:text-gray-400 mb-1 block">Clave Corporativa</label>
                  <div className="flex items-center justify-between">
                    <code className="text-[15px] font-mono text-gray-900 dark:text-white">
                      {showKey ? (license?.key || 'DL-PREMIUM-2026-X') : '••••-••••-••••-••••'}
                    </code>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 rounded-full text-[var(--color-apple-green)] bg-[var(--color-apple-green)]/10 hover:bg-[var(--color-apple-green)]/20 transition-colors"
                    >
                      {showKey ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-[12px] text-gray-500 dark:text-gray-400 block mb-0.5">Vencimiento</label>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                      {license?.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '31/12/2026'}
                    </p>
                  </div>
                  <div className="text-right">
                    <label className="text-[12px] text-gray-500 dark:text-gray-400 block mb-0.5">Sesiones Activas</label>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                      1 de {license?.max_devices || 5}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Usage */}
            <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-sm border border-black/5 dark:border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold tracking-tight">Límite de Uso Diario</span>
                <span className="text-[12px] font-medium text-gray-500">
                  {dailyUsage ? `${dailyUsage.usados_hoy} / ${dailyUsage.limite_diario}` : '0 / 60'}
                </span>
              </div>

              <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[var(--color-apple-green)] to-[#A2F0B3] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (dailyUsage?.usados_hoy || 0) / (dailyUsage?.limite_diario || 60) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{dailyUsage && dailyUsage.usados_hoy >= dailyUsage.limite_diario ? '🛑 Límite diario alcanzado' : 'Disponible para envíos'}</span>
                {dailyUsage && dailyUsage.tiempo_para_reinicio > 0 && (
                  <span>Se reinicia en {formatTime(dailyUsage.tiempo_para_reinicio)}</span>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full animate-in fade-in pt-2">
            <OperationsConsole />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-[#F5F5F7] dark:bg-[#000000]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-apple-green)]" />
          DreamLive Enterprise
        </div>
        <span>v1.2.0</span>
      </footer>
    </div>
  );
};
