import React from 'react';
import type { Toast as ToastModel, ToastType } from '../../hooks';

const toastStyles: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-800 text-white',
  warning: 'bg-amber-500 text-white',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};

export function ToastItem({ toast, onDismiss }: { toast: ToastModel; onDismiss: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium w-full max-w-[360px] animate-[slideIn_0.25s_ease] ${toastStyles[toast.type]}`}>
      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
        {toastIcons[toast.type]}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity ml-1 text-lg leading-none">
        ×
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastModel[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] flex flex-col gap-2 items-center md:items-end md:right-6 md:left-auto">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

export default ToastContainer;
