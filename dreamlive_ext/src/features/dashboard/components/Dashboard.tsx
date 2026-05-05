import React, { useState, useEffect, useRef, useCallback } from 'react';
import { browser } from 'wxt/browser';
import {
  LogOut,
  Moon,
  Sun,
  Eye,
  EyeOff,
  ExternalLink,
  Bell,
  X,
  ChevronRight,
  MonitorOff
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

const WEB_URL = import.meta.env.WXT_WEB_DOMAIN ? `https://${import.meta.env.WXT_WEB_DOMAIN}` : 'https://dreamlive.app';
const API_IMAGE_BASE = (import.meta.env.WXT_API_BASE_URL || 'https://api.dreamlive.app/api/v2').split('/api/')[0];

export const Dashboard: React.FC = () => {
  const { user, license, logout, logoutAll } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'ops'>('ops');
  const [showKey, setShowKey] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<{ limite_diario: number; usados_hoy: number; tiempo_para_reinicio: number; active_sessions: number; max_sessions: number } | null>(null);

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
          active_sessions: res.data.active_sessions || 1,
          max_sessions: res.data.max_sessions || 5
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

  // Live update listener
  useEffect(() => {
    const handleMessage = (msg: any) => {
      // Escuchar solo mensajes que vienen del background como broadcast para evitar doble conteo
      if ((msg.type === 'LEAD_CONTACTED_SUCCESS' || msg.type === 'MARK_CONTACTED') && msg.internalBroadcast) {
        console.log('[Dashboard] Lead contacted broadcast received, updating counter locally');
        setDailyUsage(prev => {
          if (!prev) return prev;
          const newUsados = prev.usados_hoy + 1;
          // Si llegamos al límite, activamos 5 min de espera si no hay tiempo definido
          return {
            ...prev,
            usados_hoy: newUsados,
            tiempo_para_reinicio: (newUsados >= prev.limite_diario && prev.tiempo_para_reinicio <= 0)
              ? 300
              : prev.tiempo_para_reinicio
          };
        });
      }
    };
    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Real-time countdown effect
  useEffect(() => {
    if (dailyUsage && dailyUsage.tiempo_para_reinicio > 0) {
      const timer = setInterval(() => {
        setDailyUsage(prev => {
          if (!prev || prev.tiempo_para_reinicio <= 0) return prev;
          return {
            ...prev,
            tiempo_para_reinicio: prev.tiempo_para_reinicio - 1
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [dailyUsage?.tiempo_para_reinicio]);

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
    if (seconds <= 0) return '00:00';
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
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
                          <img src={`${API_IMAGE_BASE}${n.image}`} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
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
            onClick={() => setActiveTab('ops')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[7px] transition-all duration-200 ${activeTab === 'ops'
              ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            Operaciones
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[7px] transition-all duration-200 ${activeTab === 'profile'
              ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            Suscripción
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {activeTab === 'profile' ? (
          <div className="space-y-4 animate-in fade-in duration-300 pt-2">

            {/* License Card */}
            <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/[0.03] dark:border-white/5 transition-all">
              <div className="px-5 py-4 border-b border-black/[0.03] dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[var(--color-apple-green)] rounded-full" />
                  <span className="text-[15px] font-semibold tracking-tight">Estado de la Licencia</span>
                </div>
                <Badge variant="green" className="bg-[var(--color-apple-green)]/10 text-[var(--color-apple-green)] border-none font-bold px-2.5">ACTIVA</Badge>
              </div>

              <div className="p-5 space-y-6">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Identificador Corporativo</label>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] p-3 rounded-xl border border-black/[0.03] dark:border-white/5 group transition-colors">
                    <code className="text-[14px] font-mono text-gray-900 dark:text-gray-200">
                      {showKey ? (license?.key || 'DL-PREMIUM-2026-X') : '••••-••••-••••-••••'}
                    </code>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-apple-green)] hover:bg-[var(--color-apple-green)]/10 transition-all"
                    >
                      {showKey ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-white/[0.03] p-3.5 rounded-2xl border border-black/[0.02] dark:border-white/5">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Vencimiento</label>
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                      {license?.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '31/12/2026'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/[0.03] p-3.5 rounded-2xl border border-black/[0.02] dark:border-white/5 relative group overflow-hidden">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Dispositivos</label>
                    <div className="flex items-end gap-1.5">
                      <span className="text-[18px] font-bold text-gray-900 dark:text-white leading-none">
                        {dailyUsage?.active_sessions || 1}
                      </span>
                      <span className="text-[12px] text-gray-400 dark:text-gray-500 font-medium pb-0.5">
                        / {dailyUsage?.max_sessions || license?.max_devices || 5}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${((dailyUsage?.active_sessions || 1) >= (dailyUsage?.max_sessions || 5)) ? 'bg-amber-500 animate-pulse' : 'bg-[var(--color-apple-green)]'}`} />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (confirm('¿Deseas desconectar todas las demás sesiones de esta licencia? Esta acción es inmediata.')) {
                        logoutAll();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F2F2F7] dark:bg-white/[0.05] hover:bg-red-50 dark:hover:bg-red-500/10 text-[#007AFF] dark:text-[#0A84FF] hover:text-red-500 dark:hover:text-red-400 rounded-2xl transition-all duration-300 text-[13px] font-semibold group shadow-sm active:scale-[0.98]"
                  >
                    <MonitorOff size={18} strokeWidth={2} className="group-hover:rotate-12 transition-transform" />
                    Desconectar sesiones activas
                  </button>
                  <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-3 px-4 leading-snug">
                    Usa esta opción si el límite de dispositivos te impide iniciar sesión en un nuevo equipo.
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Usage */}
            <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/[0.03] dark:border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold tracking-tight">Límite de Uso Diario</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Capacidad de envíos por licencia</span>
                </div>
                <div className="text-right">
                  <span className={`text-[16px] font-bold ${dailyUsage && dailyUsage.usados_hoy >= dailyUsage.limite_diario ? 'text-red-500' : 'text-[var(--color-apple-green)]'}`}>
                    {dailyUsage ? `${dailyUsage.usados_hoy} / ${dailyUsage.limite_diario}` : '0 / 60'}
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 overflow-hidden mb-4 border border-black/[0.03] dark:border-white/5">
                <div
                  className={`h-full transition-all duration-1000 rounded-full ${dailyUsage && dailyUsage.usados_hoy >= dailyUsage.limite_diario 
                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                    : 'bg-gradient-to-r from-[var(--color-apple-green)] to-[#A2F0B3]'}`}
                  style={{ width: `${Math.min(100, (dailyUsage?.usados_hoy || 0) / (dailyUsage?.limite_diario || 60) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${dailyUsage && dailyUsage.usados_hoy >= dailyUsage.limite_diario ? 'bg-red-500 animate-pulse' : 'bg-[var(--color-apple-green)]'}`} />
                  <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300">
                    {dailyUsage && dailyUsage.usados_hoy >= dailyUsage.limite_diario ? 'Límite alcanzado' : 'Disponible para envíos'}
                  </span>
                </div>
                
                {dailyUsage && dailyUsage.tiempo_para_reinicio > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-full border border-amber-200/50 dark:border-amber-500/20">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Reinicio: {formatTime(dailyUsage.tiempo_para_reinicio)}
                    </span>
                  </div>
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
