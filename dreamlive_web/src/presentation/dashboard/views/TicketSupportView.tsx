/**
 * TicketSupportView – Gestión avanzada de tickets para el equipo de soporte.
 * @module TicketSupportView
 */
import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader, Button, Badge, Card } from '../../shared';
import { TicketsAdapter } from '../../../services';
import { useNotifications, useAuth } from '../../../contexts';
import { TicketChatModal } from '../components/TicketChatModal';
import type { Ticket } from '../../../core/entities/settings';

const STATUS_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  open: 'yellow', in_progress: 'blue', resolved: 'green', closed: 'gray',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', in_progress: 'En Proceso', resolved: 'Resuelto', closed: 'Cerrado',
};

/**
 * TicketSupportView
 * Administra el flujo de soporte, permitiendo tomar, resolver y chatear 
 * con las agencias en tiempo real.
 */
export function TicketSupportView() {
  const { success, error } = useNotifications();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTickets(await TicketsAdapter.list()); }
    catch { error('Error al sincronizar tickets.'); }
    finally { setLoading(false); }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
    try {
      await TicketsAdapter.updateStatus(ticket.id, newStatus);
      success(`Ticket actualizado a ${STATUS_LABELS[newStatus]}`);
      
      // Actualizar estado local si el modal está abierto
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...ticket, status: newStatus as any });
      }
      
      load();
    } catch { 
      error('No se pudo actualizar el estado del ticket.'); 
    }
  };

  const handleDelete = async (ticket: Ticket) => {
    if (!window.confirm(`¿Estás seguro de eliminar el ticket "${ticket.subject}"? Esta acción es irreversible.`)) return;
    try {
      await TicketsAdapter.remove(ticket.id);
      success('Ticket eliminado del sistema.');
      load();
    } catch { error('Error al eliminar el ticket.'); }
  };

  const filtered = filterStatus ? tickets.filter(t => t.status === filterStatus) : tickets;

  return (
    <div className="space-y-6 animate-scale-in">
      <PageHeader
        title="Soporte y Reportes"
        subtitle="Centro de comando para resolución de incidencias en tiempo real"
        actions={
          <Button variant="outline" onClick={load} className="glass">
            <i className="fas fa-sync-alt mr-2" /> Sincronizar
          </Button>
        }
      />

      {/* Barra de Filtros Inteligentes */}
      <div className="flex flex-wrap gap-2 pb-2">
        {(['', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all duration-300 ${
              filterStatus === s
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-indigo-400'
            }`}
          >
            {s === '' ? 'Todos' : STATUS_LABELS[s]}
            <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] ${
              filterStatus === s ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {s === '' ? tickets.length : tickets.filter(t => t.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 animate-pulse">Sincronizando con el servidor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-20 text-center glass">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-inbox text-3xl text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">Bandeja de entrada vacía</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">No hay tickets pendientes en esta categoría. ¡Sigue así!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <div 
              key={t.id} 
              className="glass-card p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 group hover:translate-x-1 transition-all"
            >
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={STATUS_COLORS[t.status] ?? 'gray'}>{STATUS_LABELS[t.status]}</Badge>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                    t.priority === 'critical' ? 'border-red-200 bg-red-50 text-red-600' :
                    t.priority === 'high'     ? 'border-amber-200 bg-amber-50 text-amber-600' :
                    'border-slate-100 bg-slate-50 text-slate-500'
                  }`}>
                    {t.priority}
                  </span>
                </div>
                <h4 className="text-lg font-black text-slate-800 dark:text-white truncate mb-1">{t.subject}</h4>
                <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-1">{t.description}</p>
                <div className="flex items-center gap-4 mt-4 text-[10px] font-medium text-slate-300 uppercase tracking-widest">
                  <span><i className="fas fa-building mr-1.5" /> Agencia: {t.agency_id?.split('-')[0] || 'N/A'}</span>
                  <span><i className="fas fa-calendar-alt mr-1.5" /> {new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
                <Button 
                  variant="primary" 
                  className="flex-1 md:flex-none shadow-lg shadow-indigo-500/20"
                  onClick={() => setSelectedTicket(t)}
                >
                  <i className="fas fa-comments mr-2" /> Chatear
                </Button>
                <Button 
                  variant="outline" 
                  className="!p-3 border-red-100 dark:border-red-900/30 hover:bg-red-500 hover:text-white"
                  onClick={() => handleDelete(t)}
                >
                  <i className="fas fa-trash-alt" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Chat Integrado */}
      <TicketChatModal 
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        currentUserId={user?.id || null}
        isAdmin={true}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
