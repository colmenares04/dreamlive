/**
 * AuthContext – estado global de autenticación.
 * Provee: user, role, login, logout, isLoading.
 */
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode
} from 'react';
import { AuthAdapter, TokenStorage } from '../services';
import useAuthStore from '../stores/useAuthStore';
import type { User, UserRole } from '../core/entities';
import { UserPermissions } from '../core/entities';

// ── Tipos del contexto ────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  hasAgencyToken: boolean;
  isLoading: boolean;
  isAdminGroup: boolean;
  isAgencyGroup: boolean;
}

interface AuthActions {
  loginAgency: (email: string, password: string, captchaToken?: string) => Promise<void>;
  selectProfile: (userId: string, password?: string) => Promise<void>;
  logout: () => void;
  logoutProfile: () => void; // Logout solo del perfil, volviendo a la seleccion
  register: (payload: RegisterPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
}

interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  role?: string;
  agency_id?: string;
}

type AuthContextType = AuthState & AuthActions;

// ── Contexto ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
/**
 * AuthProvider
 *
 * Provee el estado de autenticación y acciones relacionadas a la aplicación:
 * - `loginAgency`, `selectProfile`, `logout`, `register`, etc.
 *
 * @param {{children: ReactNode}} props - Contiene los componentes hijos.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasAgencyToken, setHasAgencyToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Recargar sesión al montar (refresh de página)
  useEffect(() => {
    const bootstrap = async () => {
      // Restore session from persisted TokenStorage / zustand store
      try {
        if (TokenStorage.isAuthenticated()) {
          const me = await AuthAdapter.getMe();
          setUser(me);
        }
      } catch {
        // Token invalid/expired — clear only user tokens
        TokenStorage.clearUser();
        useAuthStore.getState().clearUser();
      }
      // Agency token presence
      setHasAgencyToken(!!TokenStorage.getAgencyToken());
      setIsLoading(false);
    };
    bootstrap();
  }, []);

  const loginAgency = useCallback(async (
    email: string, password: string, captchaToken?: string
  ) => {
    const tokens = await AuthAdapter.loginAgency(email, password, captchaToken);
    // Mirror tokens in zustand store (persists to localStorage)
    useAuthStore.getState().setTokens(tokens);
    setHasAgencyToken(true);
  }, []);

  const selectProfile = useCallback(async (userId: string, password?: string) => {
    const tokens = await AuthAdapter.selectProfile(userId, password);
    useAuthStore.getState().setTokens(tokens);
    const me = await AuthAdapter.getMe();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    useAuthStore.getState().clearAll();
    setHasAgencyToken(false);
    setUser(null);
  }, []);

  const logoutProfile = useCallback(() => {
    useAuthStore.getState().clearUser();
    setUser(null);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await AuthAdapter.register(payload);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await AuthAdapter.requestPasswordReset(email);
  }, []);

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    await AuthAdapter.confirmPasswordReset(token, newPassword);
  }, []);

  const role = user?.role ?? null;

  const value: AuthContextType = {
    user,
    role,
    isAuthenticated: !!user,
    hasAgencyToken,
    isLoading,
    isAdminGroup: role ? UserPermissions.isAdminGroup(role) : false,
    isAgencyGroup: role ? UserPermissions.isAgencyGroup(role) : false,
    loginAgency,
    selectProfile,
    logout,
    logoutProfile,
    register,
    requestPasswordReset,
    confirmPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * useAuth
 *
 * Hook para consumir el contexto de autenticación. lanza un error si se usa
 * fuera del provider para ayudar a detectar integraciones incorrectas.
 *
 * @returns {AuthContextType} - Estado y acciones de autenticación.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
