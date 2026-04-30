import { useAuthContext } from '../context/AuthContext';

/**
 * Re-exportamos los tipos para compatibilidad
 */
export type { AuthStatus } from '../context/AuthContext';

/**
 * El hook useAuth ahora consume el contexto global para asegurar
 * que el estado de autenticación esté sincronizado en toda la app.
 */
export const useAuth = () => {
  return useAuthContext();
};
