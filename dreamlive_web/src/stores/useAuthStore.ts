import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenStorage } from '../services';
import type { AuthTokens } from '../core/entities';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  agencyToken: string | null;
  role: string | null;
  agencyId: string | null;
  setTokens: (tokens: AuthTokens) => void;
  clearUser: () => void;
  clearAll: () => void;
}

/**
 * useAuthStore (zustand)
 * Persisted store for auth tokens and minimal metadata. Uses localStorage
 * under the hood (middleware `persist`). The store mirrors `TokenStorage`
 * so other modules that still use `TokenStorage` remain compatible.
 */
export const useAuthStore = create<AuthState>()(persist((set) => ({
  accessToken: TokenStorage.getAccessToken(),
  refreshToken: TokenStorage.getRefreshToken(),
  agencyToken: TokenStorage.getAgencyToken(),
  role: TokenStorage.getRole(),
  agencyId: TokenStorage.getAgencyId(),
  setTokens: (tokens: AuthTokens) => {
    // persist via TokenStorage as single source of truth for legacy code
    TokenStorage.save(tokens);
    set(() => ({
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      agencyToken: tokens.role ? String(tokens.role) === 'agency_session' ? tokens.access_token : null : null,
      role: tokens.role ?? null,
      agencyId: tokens.agency_id != null ? String(tokens.agency_id) : null,
    }));
  },
  clearUser: () => {
    TokenStorage.clearUser();
    set(() => ({ accessToken: null, refreshToken: null, role: null } as any));
  },
  clearAll: () => {
    TokenStorage.clear();
    set(() => ({ accessToken: null, refreshToken: null, agencyToken: null, role: null, agencyId: null } as any));
  },
}), { name: 'dl-auth' }));

export default useAuthStore;
