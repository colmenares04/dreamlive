/**
 * Tipos para el módulo de Configuración.
 */

export interface ProfileUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  status: string;
  agency_id: string | null;
  created_at?: string;
}

export interface Ticket {
  id: string;
  agency_id: string | null;
  assigned_to_user_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  agency_id: string | null;
  category: string;
  action: string;
  entity_name: string | null;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
