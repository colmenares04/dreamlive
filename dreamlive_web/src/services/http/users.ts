/**
 * UsersAdapter — CRUD y ajustes sobre usuarios de perfil.
 */
import { http } from './apiClient';
import type { ProfileUser } from '../../core/entities/settings';

export class UsersAdapter {
  static async list(): Promise<ProfileUser[]> {
    const { data } = await http.get<ProfileUser[]>('/users/');
    return data;
  }

  static async update(userId: string, payload: Partial<Pick<ProfileUser, 'username' | 'full_name' | 'role' | 'email'>> & { password?: string; current_password?: string; agency_id?: string | null }): Promise<ProfileUser> {
    const { data } = await http.patch<ProfileUser>(`/users/${userId}`, payload);
    return data;
  }

  static async create(payload: { username: string; full_name?: string; email: string; password?: string; role: string; agency_id?: string | null; license_id?: string }): Promise<ProfileUser> {
    const { data } = await http.post<ProfileUser>('/users/', payload);
    return data;
  }

  static async remove(userId: string): Promise<void> {
    await http.delete(`/users/${userId}`);
  }
}
