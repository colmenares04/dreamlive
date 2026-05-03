/**
 * NotificationAdapter — CRUD for notifications.
 */
import { http } from './apiClient';
import type { Notification, NotificationLatest } from '../../core/entities';

export class NotificationAdapter {
  static async list(limit = 20): Promise<Notification[]> {
    const { data } = await http.get<Notification[]>(`/notifications/?limit=${limit}`);
    return data;
  }

  static async latest(): Promise<NotificationLatest[]> {
    const { data } = await http.get<NotificationLatest[]>('/notifications/latest');
    return data;
  }

  static async create(payload: FormData): Promise<{ ok: boolean; id: string }> {
    const { data } = await http.post('/notifications/', payload, {
      headers: { 'Content-Type': undefined }
    });
    return data;
  }

  static async remove(id: string): Promise<void> {
    await http.delete(`/notifications/${id}`);
  }

  static async markAsRead(id: string): Promise<void> {
    await http.post(`/notifications/${id}/read`);
  }

  static async markAllAsRead(): Promise<void> {
    await http.post('/notifications/read-all');
  }

  static async unreadCount(): Promise<number> {
    const { data } = await http.get<{ unread: number }>('/notifications/unread-count');
    return data.unread;
  }
}
