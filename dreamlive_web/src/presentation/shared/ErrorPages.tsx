/**
 * Páginas de error: 404 Not Found y 403 Unauthorized.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';

function ErrorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px]
          rounded-full bg-slate-800/30 blur-3xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function NotFoundPage() {
  const { isAuthenticated, isAdminGroup } = useAuth();
  const home = isAuthenticated ? (isAdminGroup ? '/console' : '/panel') : '/login';

  return (
    <ErrorLayout>
      <p className="text-[120px] font-black text-slate-800 leading-none select-none">404</p>
      <p className="text-2xl font-bold text-white mb-2">Página no encontrada</p>
      <p className="text-slate-400 text-sm mb-8">
        La ruta que buscas no existe o fue movida.
      </p>
      <Link to={home}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400
          text-white font-semibold text-sm rounded-xl transition-colors">
        ← Volver al inicio
      </Link>
    </ErrorLayout>
  );
}

export function UnauthorizedPage() {
  const { isAdminGroup } = useAuth();
  const home = isAdminGroup ? '/console' : '/panel';

  return (
    <ErrorLayout>
      <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-white mb-2">Sin Acceso</p>
      <p className="text-slate-400 text-sm mb-8">
        No tienes permisos para ver esta sección.
      </p>
      <Link to={home}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600
          text-white font-semibold text-sm rounded-xl transition-colors">
        ← Ir a mi panel
      </Link>
    </ErrorLayout>
  );
}
