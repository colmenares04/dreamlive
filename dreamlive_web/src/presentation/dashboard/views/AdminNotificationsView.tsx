/**
 * AdminNotificationsView — Panel para que el superuser cree y gestione notificaciones.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader, Button, DataTable } from '../../shared';
import { NotificationAdapter } from '../../../services/http/notification';
import { formatDate } from '../../../core/utils';
import type { Notification } from '../../../core/entities';

export function AdminNotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [descExt, setDescExt] = useState('');
  const [descWeb, setDescWeb] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).slice(0, 5);
    setFiles(selected);
  };

  const handlePublish = async () => {
    if (!title.trim()) return;
    setPublishing(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description_ext', descExt);
      fd.append('description_web', descWeb);
      files.forEach(f => fd.append('images', f));
      await NotificationAdapter.create(fd);
      setTitle(''); setDescExt(''); setDescWeb(''); setFiles([]);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      console.error('Error publishing', err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta notificación?')) return;
    try {
      await NotificationAdapter.remove(id);
      await load();
    } catch (err) {
      console.error('Error deleting', err);
    }
  };

  const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.dreamlive.app/api/v2').split('/api/')[0];

  const columns = [
    {
      key: 'title' as const,
      header: 'Título',
      render: (n: Notification) => (
        <div className="py-1">
          <p className="font-semibold text-slate-900 dark:text-white text-[15px]">{n.title}</p>
          <p className="text-[13px] text-slate-500 line-clamp-1 mt-0.5 font-medium">{n.description_ext}</p>
        </div>
      ),
    },
    {
      key: 'images' as const,
      header: 'Imágenes',
      render: (n: Notification) => (
        <div className="flex -space-x-2 overflow-hidden py-1">
          {(n.images || []).map((img, i) => (
            <div key={i} className="inline-block h-10 w-10 rounded-xl ring-2 ring-white dark:ring-slate-900 overflow-hidden bg-slate-100 shadow-sm border border-slate-100 dark:border-white/10">
              <img src={`${API_BASE}${img}`} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          {(!n.images || n.images.length === 0) && <span className="text-xs text-slate-400 font-medium ml-2">—</span>}
        </div>
      ),
    },
    {
      key: 'created_at' as const,
      header: 'Fecha',
      render: (n: Notification) => (
        <span className="text-[13px] text-slate-500 font-medium">{formatDate(n.created_at)}</span>
      ),
    },
    {
      key: 'id' as const,
      header: '',
      render: (n: Notification) => (
        <button onClick={() => handleDelete(n.id)} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all group" title="Eliminar">
          <i className="fas fa-trash text-slate-300 group-hover:text-red-400 text-sm transition-colors" />
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Centro de Notificaciones</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Publica anuncios para todas las agencias y agentes.</p>
      </div>

      {/* Formulario */}
      <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Título de la publicación</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Nueva actualización disponible"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-3xl text-[15px] focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white placeholder:text-slate-300" />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                Descripción para Extensión <span className="text-slate-300 font-medium normal-case tracking-normal">(Corta)</span>
              </label>
              <textarea value={descExt} onChange={e => setDescExt(e.target.value)} rows={3} placeholder="Resumen breve para el popup..."
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-3xl text-[15px] focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none dark:text-white placeholder:text-slate-300" />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                Descripción para Web <span className="text-slate-300 font-medium normal-case tracking-normal">(Completa)</span>
              </label>
              <textarea value={descWeb} onChange={e => setDescWeb(e.target.value)} rows={7} placeholder="Descripción detallada para el dashboard..."
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-3xl text-[15px] focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none dark:text-white placeholder:text-slate-300" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
          <div className="flex-1">
            <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Imágenes adjuntas</label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="cursor-pointer group">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                  <i className="fas fa-plus text-xl" />
                </div>
                <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
              </label>

              {files.map((f, i) => (
                <div key={i} className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {files.length === 0 && <span className="text-sm text-slate-400 font-medium">No hay archivos seleccionados</span>}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button variant="primary" loading={publishing} onClick={handlePublish} disabled={!title.trim()} className="px-10 py-4 rounded-3xl shadow-xl shadow-indigo-500/20">
              <i className="fas fa-paper-plane mr-2" /> Publicar ahora
            </Button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white ml-2">Historial de Notificaciones</h3>
        <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={notifications} loading={loading} keyExtractor={n => n.id} emptyMessage="No hay notificaciones publicadas." />
          </div>
        </div>
      </div>
    </div>
  );
}
