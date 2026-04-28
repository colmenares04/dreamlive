/**
 * hooks/index.ts
 *
 * Hooks reutilizables de la aplicación. Centraliza varios hooks comunes
 * para evitar imports repetidos y facilitar tests.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Tipos Base ──────────────────────────────────────────────────────────────
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationActions {
  setPage: (p: number) => void;
  setTotal: (t: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// useDebounce
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * useDebounce
 * 
 * Retrasa la actualización de un valor hasta que haya pasado un tiempo determinado
 * desde la última vez que cambió. Útil para búsquedas o filtrados en tiempo real.
 * 
 * @param {T} value - El valor a debouncificar.
 * @param {number} [delay=400] - Tiempo de espera en milisegundos.
 * @returns {T} El valor debouncificado.
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
	const [debounced, setDebounced] = useState<T>(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}

/**
 * useAsync
 * 
 * Hook para gestionar operaciones asíncronas con estados integrados de
 * carga (loading), error y datos (data).
 * 
 * @param {Function} fn - Función asíncrona que devuelve los datos.
 * @param {React.DependencyList} [deps=[]] - Dependencias para recrear la función.
 * @returns {Object} Estado de la operación y función para recargar.
 */
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

/**
 * usePagination
 * 
 * Gestión de estado y lógica para componentes de paginación.
 * 
 * @param {number} [pageSize=50] - Cantidad de elementos por página.
 * @returns {Object} Estado de paginación y funciones controladoras.
 */
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

/**
 * useToast
 * 
 * Hook para gestionar notificaciones temporales (toasts).
 * Provee métodos especializados para éxito, error, info y advertencia.
 * 
 * @returns {Object} Lista de toasts activos y funciones para mostrar nuevos.
 */
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

	const success = useCallback((msg: string) => show(msg, 'success'), [show]);
	const error = useCallback((msg: string) => show(msg, 'error'), [show]);
	const info = useCallback((msg: string) => show(msg, 'info'), [show]);
	const warning = useCallback((msg: string) => show(msg, 'warning'), [show]);

	return {
		toasts,
		success,
		error,
		info,
		warning,
		dismiss,
	};
}

/**
 * useConfirm
 * 
 * Hook para orquestar diálogos de confirmación asíncronos.
 * Permite esperar una respuesta del usuario (true/false) antes de proceder.
 * 
 * @returns {Object} Función de confirmación y estado para el modal.
 */
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

// Re-export visual captcha helpers
export { useCaptcha, CaptchaBox } from './useCaptcha';
