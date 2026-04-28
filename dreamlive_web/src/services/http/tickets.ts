/**
 * TicketsAdapter — soporte / ticketing CRUD.
 */
import { http } from './apiClient';
import type { Ticket } from '../../core/entities/settings';

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export class TicketsAdapter {
  static async list(): Promise<Ticket[]> {
    const { data } = await http.get<Ticket[]>('/tickets/');
    return data;
  }

  static async create(payload: { subject: string; description: string; priority?: string }): Promise<Ticket> {
    const { data } = await http.post<Ticket>('/tickets/', payload);
    return data;
  }

  static async updateStatus(ticketId: string, status: string): Promise<Ticket> {
    const { data } = await http.patch<Ticket>(`/tickets/${ticketId}/status`, { status });
    return data;
  }

  static async remove(ticketId: string): Promise<void> {
    await http.delete(`/tickets/${ticketId}`);
  }

  static async getHistory(ticketId: string): Promise<TicketMessage[]> {
    const { data } = await http.get<TicketMessage[]>(`/chat/history/${ticketId}`);
    return data;
  }
}
