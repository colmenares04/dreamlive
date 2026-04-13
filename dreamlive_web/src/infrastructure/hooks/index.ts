/**
 * Hooks reutilizables de la aplicación.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// useDebounce
// ═══════════════════════════════════════════════════════════════════════════════
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ═══════════════════════════════════════════════════════════════════════════════
// useAsync – ejecuta una función async con estado loading/error/data
// ═══════════════════════════════════════════════════════════════════════════════
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null, loading: true, error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      setState({
        data: null, loading: false,
        error: err?.response?.data?.detail ?? err?.message ?? 'Error desconocido',
      });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { execute(); }, [execute]);

  return { ...state, reload: execute };
}

// ═══════════════════════════════════════════════════════════════════════════════
// usePagination – lógica de paginación reutilizable
// ═══════════════════════════════════════════════════════════════════════════════
interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginationActions {
  setPage: (page: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
}

export function usePagination(pageSize: number = 50): PaginationState & PaginationActions {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    setPage,
    setTotal,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    reset: () => setPage(1),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useToast – notificaciones inline sencillas
// ═══════════════════════════════════════════════════════════════════════════════
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = `toast-${++counter.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    info: (msg: string) => show(msg, 'info'),
    warning: (msg: string) => show(msg, 'warning'),
    dismiss,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useConfirm – confirmación antes de acciones destructivas
// ═══════════════════════════════════════════════════════════════════════════════
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    message: string;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, message: '', resolve: null });

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });
  }, []);

  const handleResponse = useCallback((value: boolean) => {
    state.resolve?.(value);
    setState({ open: false, message: '', resolve: null });
  }, [state]);

  return {
    confirm,
    isOpen: state.open,
    message: state.message,
    onConfirm: () => handleResponse(true),
    onCancel: () => handleResponse(false),
  };
}
