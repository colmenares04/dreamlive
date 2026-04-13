/**
 * Guards de rutas – redirige si el usuario no tiene el rol requerido.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../../core/entities';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Si se provee, solo usuarios con uno de estos roles pueden acceder. */
  roles?: UserRole[];
  /** Ruta a redirigir si no autenticado. Default: /login */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  roles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles && role && !roles.includes(role)) {
    // Usuario autenticado pero sin el rol correcto → redirigir a su panel
    const fallback = role === 'admin' || role === 'programmer' ? '/console' : '/panel';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

/** Guard inverso: si ya estás autenticado, redirige al panel correcto. */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdminGroup } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Navigate to={isAdminGroup ? '/console' : '/panel'} replace />;
  }

  return <>{children}</>;
}
