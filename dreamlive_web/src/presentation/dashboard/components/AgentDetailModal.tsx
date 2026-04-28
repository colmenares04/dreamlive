import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Button, Badge } from '../../shared';
import { LicenseAdapter } from '../../../services';
import { useNotifications } from '../../../contexts';
import type { License } from '../../../core/entities';

interface AgentDetailModalProps {
  license: License | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AgentDetailModal({ license, open, onClose, onRefresh }: AgentDetailModalProps) {
  const { success, error } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    password: '',
    limit: 60,
    refresh: 720,
    keywords: ''
  });

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (license) {
      setForm({
        password: license.admin_password || '',
        limit: license.request_limit || 60,
        refresh: license.refresh_minutes || 720,
        keywords: license.keywords || ''
      });
    }
  }, [license]);

  const handleSave = async () => {
    if (!license) return;
    setLoading(true);
    try {
      await LicenseAdapter.updateConfig(license.id, {
        admin_password: form.password,
        request_limit: form.limit,
        refresh_minutes: form.refresh,
        keywords: form.keywords
      });
      success('Configuración actualizada correctamente');
      onRefresh();
      onClose();
    } catch {
      error('Error al actualizar configuración');
    } finally {
      setLoading(false);
    }
  };

  // Always render the portal so transitions work; just hide when no license
  const isActive = license
    ? license.status === 'active' && (!license.expires_at || new Date(license.expires_at) > new Date())
    : false;

  const totalLeads = license ? 0 : 0;
  const contacted  = license ? 0 : 0;
  const available  = license ? 0 : 0;

  const drawer = (
    <div className={clsx("fixed inset-0 z-[9999] transition-opacity duration-300", open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-transparent"
      />

      {/* Drawer panel */}
      <div className={clsx(
        "absolute top-0 right-0 h-full w-full max-w-[500px] bg-white shadow-2xl flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10 font-black tracking-tight">
          <h2 className="text-xl font-extrabold text-slate-800">
            Detalle de Agente
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {license && (
            <>
              {/* ── Agent header ─────────────────────────────────────── */}
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-200 shrink-0">
                  {license.recruiter_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black text-slate-800 leading-tight truncate">
                    {license.recruiter_name}
                  </h3>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <code className="text-[11px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 border border-slate-200 font-mono truncate max-w-[180px]">
                      {license.key}
                    </code>
                    <Badge variant={isActive ? 'green' : 'gray'}>
                      {isActive ? 'En Línea' : 'Desconectado'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Conversión
                  </p>
                  <p className="text-2xl font-black text-indigo-600">0%</p>
                </div>
              </div>

              {/* ── Stats grid ─────────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Leads',      value: totalLeads, bg: 'bg-white',       border: 'border-slate-200', text: 'text-slate-800', labelCol: 'text-slate-400' },
                  { label: 'Contactados',       value: contacted,  bg: 'bg-emerald-50',    border: 'border-emerald-100', text: 'text-emerald-600', labelCol: 'text-emerald-600/70' },
                  { label: 'Disponibles',       value: available,  bg: 'bg-amber-50',    border: 'border-amber-100', text: 'text-amber-600', labelCol: 'text-amber-600/70' },
                  { label: 'Capturados Hoy',    value: 0,          bg: 'bg-slate-50',    border: 'border-slate-200', text: 'text-slate-800', labelCol: 'text-slate-400' },
                  { label: 'Contactados Hoy',   value: 0,          bg: 'bg-indigo-50/50',    border: 'border-indigo-100', text: 'text-indigo-600', labelCol: 'text-slate-400' },
                  { label: 'Pendientes Hoy',    value: 0,          bg: 'bg-slate-50',    border: 'border-slate-200', text: 'text-slate-800', labelCol: 'text-slate-400' },
                ].map((s) => (
                  <div key={s.label} className={clsx(
                    "border rounded-2xl p-4 text-center transition-all",
                    s.bg, s.border
                  )}>
                    <p className={clsx("text-[9px] font-bold uppercase tracking-wider mb-1", s.labelCol)}>
                      {s.label}
                    </p>
                    <p className={clsx("text-xl font-black", s.text)}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Activity chart mock ────────────────────────────────── */}
              <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-chart-bar text-indigo-500" /> Actividad Reciente (7 días)
                </h4>
                <div className="h-28 flex items-end gap-2 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  {[25, 50, 33, 75, 100, 25, 50].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors relative group" style={{ height: `${h}%` }}>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                         {h}% éxito
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Config section ────────────────────────────────────── */}
              <div className="border border-slate-200 rounded-3xl p-6 shadow-sm bg-white">
                <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-sliders-h text-indigo-500" /> Configuración de Licencia
                </h4>

                <div className="space-y-6">
                  {/* Keywords */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Palabras Clave (Scope)
                    </label>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {form.keywords.split('/').filter(Boolean).map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={form.keywords}
                      onChange={e => setForm({ ...form, keywords: e.target.value })}
                      placeholder="Ej: batallas/pk/versus"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Contraseña Admin Reclutador
                    </label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                      <input
                        type="text"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Limit + Refresh */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Límite Diario
                      </label>
                      <input
                        type="number"
                        value={form.limit}
                        onChange={e => setForm({ ...form, limit: +e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Refresh (Min)
                      </label>
                      <input
                        type="number"
                        value={form.refresh}
                        onChange={e => setForm({ ...form, refresh: +e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full py-4 rounded-2xl text-base font-bold shadow-lg shadow-indigo-100 mt-4"
                    loading={loading}
                    onClick={handleSave}
                  >
                    Guardar Configuración
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}
