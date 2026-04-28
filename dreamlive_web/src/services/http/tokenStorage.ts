/**
 * TokenStorage — pequeño wrapper sobre `localStorage` para JWT y metadatos.
 * Guarda `access_token`, `refresh_token`, rol y `agency_id` de forma persistente
 * para que la sesión sobreviva al cerrar el navegador.
 */
import type { AuthTokens } from '../../core/entities';

export class TokenStorage {
  static readonly VERSION = '1.0.0';
  private static ACCESS = 'dl_access';
  private static REFRESH = 'dl_refresh';
  private static AGENCY_ACCESS = 'dl_agency_access';
  private static ROLE = 'dl_role';
  private static AGENCY = 'dl_agency';

  static save(tokens: AuthTokens): void {
    if ((tokens.role as string) === 'agency_session') {
      localStorage.setItem(this.AGENCY_ACCESS, tokens.access_token);
    } else {
      localStorage.setItem(this.ACCESS, tokens.access_token);
      if (tokens.refresh_token) localStorage.setItem(this.REFRESH, tokens.refresh_token);
      if (tokens.role) localStorage.setItem(this.ROLE, tokens.role);
    }
    if (tokens.agency_id != null) {
      localStorage.setItem(this.AGENCY, String(tokens.agency_id));
    }
  }

  static getAccessToken(): string | null { return localStorage.getItem(this.ACCESS); }
  static getAgencyToken(): string | null { return localStorage.getItem(this.AGENCY_ACCESS); }
  static getRefreshToken(): string | null { return localStorage.getItem(this.REFRESH); }
  static getRole(): string | null { return localStorage.getItem(this.ROLE); }
  static getAgencyId(): string | null { return localStorage.getItem(this.AGENCY); }

  static clear(): void {
    localStorage.removeItem(this.ACCESS);
    localStorage.removeItem(this.REFRESH);
    localStorage.removeItem(this.AGENCY_ACCESS);
    localStorage.removeItem(this.ROLE);
    localStorage.removeItem(this.AGENCY);
  }

  static clearUser(): void {
    localStorage.removeItem(this.ACCESS);
    localStorage.removeItem(this.REFRESH);
    localStorage.removeItem(this.ROLE);
  }

  static isAuthenticated(): boolean { return !!this.getAccessToken(); }
}
