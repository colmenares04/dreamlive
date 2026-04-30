export type LeadStatus =
  | "recopilado"
  | "disponible"
  | "contactado"
  | "descartado";

export interface Agency {
  id: string;
  name: string;
  recruiter_name?: string;
  logo_url?: string;
}

export interface License {
  id: string;
  agency_id: string;
  license_key: string;
  email?: string;
  is_active: boolean;
  max_devices: number;
  expiration_date?: string;
  keywords?: string;
  message_templates?: string[]; // Es JSONB en DB, aquí es array de strings
  recruiter_name?: string;
  limit_requests?: number;
  refresh_minutes?: number;
  invitation_types?: string[]; // Ej: ["Normal", "Elite"]
}

export interface AppVersion {
  id: string;
  version_number: string;
  changelog: string;
  release_date: string;
  file_url: string;
  tags: string[]; // ['feat', 'fix', 'perf']
  is_active: boolean;
  platform: string;
}

export interface TikTokLead {
  id: string;
  license_id: string;
  username: string;
  status: LeadStatus;
  captured_at: string;
  verified_at?: string;
  contacted_at?: string;
  viewer_count?: number; // Puede no estar si hay likes
  likes_count?: number; // Nuevo: Puede no estar si hay viewers
  source?: string; // Nuevo: "tiktok_live_viewers" | "tiktok_live_likes"
}

export interface AppSelector {
  id: number;
  key_name: string;
  selector_value: string;
  description?: string;
}

// --- INTERFACES MAESTRAS (Supabase) ---
export interface Database {
  dreamtool: {
    Tables: {
      agencies: {
        Row: Agency;
        Insert: Omit<Agency, "id" | "created_at">;
        Update: Partial<Agency>;
      };
      licenses: {
        Row: License;
        // En Insert, invitation_types es opcional porque tiene DEFAULT en DB
        Insert: Omit<License, "id" | "created_at" | "updated_at">;
        Update: Partial<License>;
      };
      tiktok_leads: {
        Row: TikTokLead;
        Insert: {
          id?: string;
          license_id: string;
          username: string;
          status?: LeadStatus;
          captured_at?: string;
          verified_at?: string;
          contacted_at?: string;
          viewer_count?: number;
          likes_count?: number;
          source?: string;
        };
        Update: Partial<TikTokLead>;
      };
      app_selectors: {
        Row: AppSelector;
        Insert: Omit<AppSelector, "id">;
        Update: Partial<AppSelector>;
      };
      license_sessions: {
        Row: {
          id: string;
          license_id: string;
          device_id: string;
          browser?: string;
          os?: string;
          ip_address?: string;
          last_ping: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          license_id: string;
          device_id: string;
          browser?: string;
          os?: string;
          ip_address?: string;
          last_ping?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          license_id?: string;
          device_id?: string;
          browser?: string;
          os?: string;
          ip_address?: string;
          last_ping?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      ping_license_v2: {
        Args: {
          p_license_key: string;
          p_device_id: string;
          p_browser: string;
          p_os: string;
        };
        Returns: void;
      };
    };
  };
  public: {
    Tables: {
      [key: string]: any;
    };
    Functions: {
      ping_license_v2: {
        Args: {
          p_license_key: string;
          p_device_id: string;
          p_browser: string;
          p_os: string;
        };
        Returns: void;
      };
    };
  };
}
