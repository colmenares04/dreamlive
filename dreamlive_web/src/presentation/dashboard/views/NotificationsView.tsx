/**
 * NotificationsView — Panel para agencias y agentes para ver las notificaciones.
 * Se suscribe al WebSocket para recibir nuevas notificaciones en tiempo real.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, Button } from '../../shared';
import { NotificationAdapter } from '../../../services/http/notification';
import { formatDate } from '../../../core/utils';
import type { Notification } from '../../../core/entities';
import io from 'socket.io-client';

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://217.216.94.178:8000').replace(/\/api\/v[12]$/, '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotifications(await NotificationAdapter.list(50));
    } catch (err) {
      console.error('Error loading notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // WebSocket listener for real-time notifications
  useEffect(() => {
    try {
      const socket = io(API_BASE, { path: '/socket.io', transports: ['websocket', 'polling'] });
      socket.on('new_notification', (data: any) => {
        // Prepend the new notification to the list
        setNotifications(prev => [{
          id: data.id,
          user_id: data.user_id || '',
          title: data.title,
          description_ext: data.description_ext || '',
          description_web: data.description_web || '',
          images: data.images || [],
          created_at: data.created_at || new Date().toISOString(),
          is_read: false,
        }, ...prev]);
      });
      return () => { socket.disconnect(); };
    } catch (e) {
      console.warn('WebSocket not available for notifications', e);
    }
  }, [API_BASE]);

  const handleMarkAllRead = async () => {
    try {
      await NotificationAdapter.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await NotificationAdapter.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Notificaciones</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="rounded-full border-slate-200 dark:border-white/10">
            <i className="fas fa-check-double mr-2" /> Marcar todo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {notifications.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
              <i className="fas fa-bell-slash text-3xl text-slate-300 dark:text-slate-600 mb-4 block" />
              <p className="text-slate-500">No tienes notificaciones por ahora.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`group relative bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 shadow-sm border transition-all hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 ${!n.is_read
                    ? 'border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-500/5'
                    : 'border-slate-100 dark:border-white/5'
                  }`}
              >
                <div className="flex gap-6">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${n.is_read
                      ? 'bg-slate-100 dark:bg-white/5 text-slate-400'
                      : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    }`}>
                    <i className={`fas ${n.is_read ? 'fa-bell' : 'fa-bell animate-bounce-slow text-xl'}`} />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">{n.title}</h3>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">{formatDate(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                        >
                          Nuevo
                        </button>
                      )}
                    </div>

                    <p className="text-[16px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{n.description_web}</p>

                    {n.images && n.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        {n.images.map((img, idx) => (
                          <div key={idx} className="aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-inner">
                            <img
                              src={`${API_BASE}${img}`}
                              alt=""
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
