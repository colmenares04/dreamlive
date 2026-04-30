export type LeadStatus = 'recopilado' | 'disponible' | 'contactado' | 'descartado';

export interface Lead {
  id?: string;
  username: string;
  status: LeadStatus;
  viewer_count?: number;
  likes_count?: number;
  source?: string;
  captured_at?: string;
  verified_at?: string;
  contacted_at?: string;
}

export interface LicenseTemplates {
  message_templates: string[];
}

export interface LimitCheckResponse {
  allowed: boolean;
  count: number;
  limit: number;
  reset_in?: string; // e.g. "12h 30m"
}
