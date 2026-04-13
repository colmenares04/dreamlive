/**
 * Entidades de dominio del frontend – espejo de las del backend.
 * Sin dependencias de React ni HTTP.
 */

// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'programmer' | 'owner' | 'agent';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  agency_id: string | null;
}

// ── Permisos por rol ──────────────────────────────────────────────────────────
export class UserPermissions {
  static isAdminGroup(role: UserRole): boolean {
    return role === 'admin' || role === 'programmer';
  }

  static isAgencyGroup(role: UserRole): boolean {
    return role === 'owner' || role === 'agent';
  }

  static canManageLicenses(role: UserRole): boolean {
    return role === 'admin';
  }

  static canPushUpdates(role: UserRole): boolean {
    return role === 'admin' || role === 'programmer';
  }

  static canManageTeam(role: UserRole): boolean {
    return role === 'admin' || role === 'owner';
  }

  static canPurgeLeads(role: UserRole): boolean {
    return role === 'admin' || role === 'owner';
  }

  static canSeeAdminConsole(role: UserRole): boolean {
    return UserPermissions.isAdminGroup(role);
  }

  static canSeeAgencyPanel(role: UserRole): boolean {
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
}

// ── Lead ──────────────────────────────────────────────────────────────────────
export type LeadStatus = 'disponible' | 'contactado' | 'recopilado';

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
  available_leads: number;
  pending_collected: number;
}

export interface AgencyDashboard {
  active_licenses: number;
  total_leads: number;
  contacted_total: number;
  available_leads: number;
  collected_leads: number;
  today_contacted: number;
  today_collected: number;
  top_keywords: string[];
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
