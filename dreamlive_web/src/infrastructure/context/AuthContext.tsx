/**
 * AuthContext – estado global de autenticación.
 * Provee: user, role, login, logout, isLoading.
 */
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode
} from 'react';
import { AuthAdapter, TokenStorage } from '../../adapters/http';
import type { User, UserRole } from '../../core/entities';
import { UserPermissions } from '../../core/entities';

// ── Tipos del contexto ────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdminGroup: boolean;
  isAgencyGroup: boolean;
}

interface AuthActions {
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  loginAdmin: (email: string, password: string, captchaToken?: string) => Promise<void>;
  logout: () => void;
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
  agency_id?: number;
}

type AuthContextType = AuthState & AuthActions;

// ── Contexto ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recargar sesión al montar (refresh de página)
  useEffect(() => {
    const bootstrap = async () => {
      if (TokenStorage.isAuthenticated()) {
        try {
          const me = await AuthAdapter.getMe();
          setUser(me);
        } catch {
          TokenStorage.clear();
        }
      }
      setIsLoading(false);
    };
    bootstrap();
  }, []);

  const login = useCallback(async (
    email: string, password: string, captchaToken?: string
  ) => {
    await AuthAdapter.login(email, password, captchaToken);
    const me = await AuthAdapter.getMe();
    setUser(me);
  }, []);

  const loginAdmin = useCallback(async (
    email: string, password: string, captchaToken?: string
  ) => {
    await AuthAdapter.loginAdmin(email, password, captchaToken);
    const me = await AuthAdapter.getMe();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    AuthAdapter.logout();
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
    isLoading,
    isAdminGroup: role ? UserPermissions.isAdminGroup(role) : false,
    isAgencyGroup: role ? UserPermissions.isAgencyGroup(role) : false,
    login,
    loginAdmin,
    logout,
    register,
    requestPasswordReset,
    confirmPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
