/**
 * Entidades de dominio del frontend – espejo de las del backend.
 * Sin dependencias de React ni HTTP.
 */

// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole = 'superuser' | 'agency_admin' | 'agent';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  agency_id: string | null;
  license_id?: string | null;
  license_key?: string | null;
}

export interface RolePermissions {
  can_manage_team: boolean;
  can_manage_licenses: boolean;
  can_view_metrics: boolean;
  can_purge_leads: boolean;
  can_view_leads: boolean;
  can_open_tickets: boolean;
}

export interface AgencyPermissionsConfig {
  agent: RolePermissions;
}

// ── Permisos por rol ──────────────────────────────────────────────────────────
/**
 * UserPermissions - Clase utilitaria para verificar acceso.
 * Ahora soporta configuración dinámica por agencia.
 */
export class UserPermissions {
  static isAdminGroup(role: UserRole | string): boolean {
    return role?.toLowerCase() === 'superuser';
  }

  static isAgencyGroup(role: UserRole | string): boolean {
    const norm = role?.toLowerCase();
    return norm === 'agency_admin' || norm === 'agent' || norm === 'recruiter';
  }

  // --- Herramientas de decisión dinámica ---
  
  private static getRoleConfig(role: UserRole | string, config?: AgencyPermissionsConfig): Partial<RolePermissions> {
    const norm = role?.toLowerCase();
    if (norm === 'superuser') return { 
      can_manage_team: true, can_manage_licenses: true, can_view_metrics: true, 
      can_purge_leads: true, can_view_leads: true, can_open_tickets: true 
    };
    
    if (norm === 'agency_admin') return { 
      can_manage_team: true, can_manage_licenses: true, can_view_metrics: true, 
      can_purge_leads: true, can_view_leads: true, can_open_tickets: true 
    };

    if (!config) return {};
    return config[norm as keyof AgencyPermissionsConfig] || {};
  }

  static canManageTeam(role: UserRole | string, config?: AgencyPermissionsConfig): boolean {
    const norm = role?.toLowerCase();
    if (norm === 'superuser' || norm === 'agency_admin') return true;
    return !!this.getRoleConfig(norm, config).can_manage_team;
  }

  static canManageLicenses(role: UserRole | string, config?: AgencyPermissionsConfig): boolean {
    const norm = role?.toLowerCase();
    if (norm === 'superuser' || norm === 'agency_admin') return true;
    return !!this.getRoleConfig(norm, config).can_manage_licenses;
  }

  static canViewMetrics(role: UserRole | string, config?: AgencyPermissionsConfig): boolean {
    const norm = role?.toLowerCase();
    if (norm === 'superuser' || norm === 'agency_admin') return true;
    return !!this.getRoleConfig(norm, config).can_view_metrics;
  }

  static canPurgeLeads(role: UserRole | string, config?: AgencyPermissionsConfig): boolean {
    const norm = role?.toLowerCase();
    if (norm === 'superuser' || norm === 'agency_admin') return true;
    return !!this.getRoleConfig(norm, config).can_purge_leads;
  }

  static canViewLeads(role: UserRole | string, config?: AgencyPermissionsConfig): boolean {
    const norm = role?.toLowerCase();
    if (norm === 'superuser' || norm === 'agency_admin') return true;
    return !!this.getRoleConfig(norm, config).can_view_leads;
  }

  static canOpenTickets(role: UserRole | string, config?: AgencyPermissionsConfig): boolean {
    const norm = role?.toLowerCase();
    if (norm === 'superuser' || norm === 'agency_admin') return true;
    return !!this.getRoleConfig(norm, config).can_open_tickets;
  }

  static canPushUpdates(role: UserRole | string): boolean {
    return role?.toLowerCase() === 'superuser';
  }

  static canSeeAdminConsole(role: UserRole | string): boolean {
    return UserPermissions.isAdminGroup(role);
  }

  static canSeeAgencyPanel(role: UserRole | string): boolean {
    return UserPermissions.isAgencyGroup(role);
  }
}

// ── Agencia ───────────────────────────────────────────────────────────────────
export interface Agency {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

// ── Licencia ──────────────────────────────────────────────────────────────────
export type LicenseStatus = 'active' | 'inactive' | 'expired';

export interface License {
  id: string;
  key: string;
  agency_id: string;
  recruiter_name: string;
  status: LicenseStatus;
  request_limit: number;
  refresh_minutes: number;
  expires_at: string | null;
  days_remaining: number;
  admin_password?: string;
  keywords?: string;
  // Métricas
  today_leads?: number;
  total_leads?: number;
  last_ping?: string | null;
}

// ── Lead ──────────────────────────────────────────────────────────────────────
export type LeadStatus = 'recopilado' | 'disponible' | 'contactado' | 'descartado';

export interface Lead {
  id: string;
  username: string;
  license_id: string;
  status: LeadStatus;
  followers: number;
  following: number;
  keywords: string[];
  profile_url: string | null;
  contacted_at: string | null;
  created_at: string;
  // Métricas de Impacto
  viewer_count?: number;
  likes_count?: number;
  source?: string;
}

export interface PaginatedLeads {
  total: number;
  page: number;
  page_size: number;
  items: Lead[];
}

// ── App Version ───────────────────────────────────────────────────────────────
export type Platform = 'windows' | 'macos';
export type VersionTag = 'new' | 'fix' | 'feat' | 'perf' | 'sec';

export interface AppVersion {
  id: string;
  version_number: string;
  platform: Platform;
  file_url: string;
  file_size_kb: number;
  changelog: string;
  tags: VersionTag[];
  is_active: boolean;
  release_date: string;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export interface AdminOverview {
  total_licenses: number;
  active_agencies: number;
  active_sessions: number;
  available_leads: number;
  pending_collected: number;
  today_contacted: number;
  today_collected: number;
  avg_ticket_sla: number;
  trends: Array<{ date: string, count: number }>;
  recent_activity: Array<{ 
    category: string, 
    action: string, 
    entity: string, 
    date: string 
  }>;
}

export interface AgencyDashboard {
  active_licenses: number;
  total_leads: number;
  contacted_total: number;
  today_contacted: number;
  available_leads: number;
  collected_leads: number;
  conversion_rate: number;
  trends: Array<{ date: string, count: number }>;
  top_keywords: string[];
}

// ── Notifications ─────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  description_ext: string;
  description_web: string;
  images: string[];
  created_at: string;
  is_read: boolean;
}

export interface NotificationLatest {
  id: string;
  title: string;
  description_ext: string;
  created_at: string | null;
  image: string | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
  agency_id: string | null;
}
