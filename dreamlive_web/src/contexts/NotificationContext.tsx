/**
 * Componentes de notificación global.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useToast, useConfirm } from '../hooks';
import { ToastContainer } from '../components/ui';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════════════════════════════════════
export function ConfirmDialog({ isOpen, message, onConfirm, onCancel }: {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-transparent" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-center text-slate-700 text-sm font-medium mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════
interface NotificationContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  confirm: (msg: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const confirmState = useConfirm();

  return (
    <NotificationContext.Provider value={{
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
      confirm: confirmState.confirm,
    }}>
      {children}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de <NotificationProvider>');
  return ctx;
}
