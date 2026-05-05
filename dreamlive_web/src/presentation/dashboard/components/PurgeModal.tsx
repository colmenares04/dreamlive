import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Modal } from '../../shared';
import type { LeadStatus } from '../../../core/entities';

interface PurgeModalProps {
  open: boolean;
  onClose: () => void;
  onPurge: (type: LeadStatus | 'all') => Promise<void>;
  title?: string;
  description?: string;
}

export function PurgeModal({ 
  open, 
  onClose, 
  onPurge, 
  title = "Limpieza de Datos",
  description = "Selecciona el segmento de base de datos que deseas depurar de tu panel actual."
}: PurgeModalProps) {
  const [busy, setBusy] = useState(false);

  const handle = async (type: LeadStatus | 'all') => {
    setBusy(true);
    try {
      await onPurge(type);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const options: { type: LeadStatus | 'all'; icon: string; label: string; desc: string; color: string; bg: string }[] = [
    { type: 'recopilado', icon: 'fa-filter',        label: 'Recopilados',      desc: 'Prospectos sin procesar',            color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { type: 'disponible', icon: 'fa-circle-check',  label: 'Disponibles',      desc: 'Listos para contactar',              color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { type: 'contactado', icon: 'fa-paper-plane',   label: 'Contactados',      desc: 'Mensajes ya enviados',               color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { type: 'all',        icon: 'fa-bomb',           label: 'Eliminar TODO',    desc: 'Acción irreversible',                color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-500/10' },
  ];

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 dark:border-white/10">
          <i className="fas fa-broom text-2xl" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(o => (
          <button
            key={o.type}
            disabled={busy}
            onClick={() => handle(o.type)}
            className={clsx(
              "group relative flex items-start gap-4 p-5 rounded-2xl border transition-all text-left disabled:opacity-50",
              o.type === 'all' 
                ? "border-red-100 dark:border-red-500/20 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5" 
                : "border-slate-100 dark:border-white/5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5"
            )}>
            <div className={`w-12 h-12 shrink-0 rounded-xl ${o.bg} flex items-center justify-center text-lg ${o.color} group-hover:scale-110 transition-transform`}>
              <i className={`fas ${o.icon}`} />
            </div>
            <div className="flex-1 pr-4">
              <span className="block font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight mb-1">{o.label}</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{o.desc}</span>
            </div>
            <i className="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-700 mt-1" />
          </button>
        ))}
      </div>

      {busy && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[inherit]">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Depurando Datos...</span>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
        <button 
          onClick={onClose} 
          disabled={busy}
          className="px-6 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
