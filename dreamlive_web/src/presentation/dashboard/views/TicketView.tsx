/**
 * TicketView – Soporte Premium con Chat en Tiempo Real.
 * @module TicketView
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader, Button, Badge, Card, Modal } from '../../shared';
import { TicketsAdapter } from '../../../services';
import { useNotifications } from '../../../contexts';
import { useChat } from '../../../hooks/useChat';
import { useWebNotifications } from '../../../hooks/useWebNotifications';
import type { Ticket } from '../../../core/entities/settings';
import { TicketChatModal } from '../components/TicketChatModal';

const STATUS_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  open: 'yellow', in_progress: 'blue', resolved: 'green', closed: 'gray',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', in_progress: 'En Proceso', resolved: 'Resuelto', closed: 'Cerrado',
};

// ─── Modal Nuevo Ticket ──────────────────────────────────────────────────────
function NewTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error } = useNotifications();
  const [subject, setSubject]       = useState('');
  const [description, setDesc]      = useState('');
  const [priority, setPriority]     = useState('medium');
  const [saving, setSaving]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await TicketsAdapter.create({ subject, description, priority });
      success('Ticket enviado. Puedes seguir el progreso en el chat.');
      onCreated(); onClose();
      setSubject(''); setDesc(''); setPriority('medium');
    } catch { error('Error al crear el ticket.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Abrir Nuevo Ticket" size="md">
      <div className="space-y-6">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl">
          <p className="text-slate-700 dark:text-slate-300 font-bold text-xs leading-relaxed uppercase tracking-widest flex items-center gap-3">
            <i className="fas fa-info-circle text-indigo-500 text-lg" />
            Explica el motivo de tu consulta. Nuestro equipo técnico responderá lo antes posible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-900 dark:text-white block uppercase tracking-[0.2em] ml-1">Asunto del Ticket</label>
            <input 
              required 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              placeholder="Ej: Problema con activación de licencia" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-900 dark:text-white block uppercase tracking-[0.2em] ml-1">Detalles de la Incidencia</label>
            <textarea 
              required 
              rows={4} 
              value={description} 
              onChange={e => setDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              placeholder="Describe detalladamente el problema que estás experimentando..." 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 block uppercase tracking-[0.2em] ml-1">Nivel de Prioridad</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'low', label: 'BAJA', active: 'bg-indigo-600 text-white border-indigo-600 shadow-lg' },
                { id: 'medium', label: 'MEDIA', active: 'bg-blue-600 text-white border-blue-600 shadow-lg' },
                { id: 'high', label: 'ALTA', active: 'bg-rose-600 text-white border-rose-600 shadow-lg' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`py-3 px-1 text-[10px] font-black rounded-xl border transition-all duration-300 uppercase tracking-widest ${
                    priority === p.id 
                      ? p.active 
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2" 
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              loading={saving} 
              className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl border-0"
            >
              Enviar Ticket
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── Vista Principal ──────────────────────────────────────────────────────────
/**
 * TicketView - Gestión de soporte con UI de alta gama.
 */
export function TicketView() {
  const { error } = useNotifications();
  const { requestPermission } = useWebNotifications();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTickets(await TicketsAdapter.list()); }
    catch { error('No pudimos cargar tus tickets.'); }
    finally { setLoading(false); }
  }, [error]);

  useEffect(() => { 
    load(); 
    requestPermission(); // Solicitar permiso de notificaciones al entrar
  }, [load, requestPermission]);

  return (
    <div className="space-y-6 animate-scale-in">
      <PageHeader
        title="Centro de Soporte"
        subtitle="Conversaciones directas con el equipo técnico de DreamLive"
        actions={
          <Button variant="primary" onClick={() => setShowNew(true)} className="!rounded-full shadow-lg shadow-indigo-500/20">
            <i className="fas fa-plus mr-2" /> Nuevo Ticket
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center glass border-dashed">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
            <i className="fas fa-comment-dots text-4xl text-indigo-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Todo en orden</h3>
          <p className="text-slate-400 dark:text-slate-500 max-w-sm mb-8">No tienes tickets de soporte activos. Si tienes alguna duda, abre un ticket y te contactaremos de inmediato.</p>
          <Button variant="primary" onClick={() => setShowNew(true)}>Abrir incidencia</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tickets.map(t => (
            <div 
              key={t.id} 
              onClick={() => setSelectedTicket(t)}
              className="glass-card p-5 group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${
                t.status === 'open' ? 'bg-amber-500' : 'bg-indigo-500'
              }`} />
              
              <div className="flex justify-between items-start mb-4">
                <Badge variant={STATUS_COLORS[t.status] ?? 'gray'}>{STATUS_LABELS[t.status]}</Badge>
                <div className={`w-2 h-2 rounded-full ${
                  t.priority === 'critical' ? 'bg-red-500 animate-pulse' :
                  t.priority === 'high'     ? 'bg-amber-400' :
                  t.priority === 'medium'   ? 'bg-blue-400'  : 'bg-slate-300'
                }`} title={`Prioridad: ${t.priority}`} />
              </div>

              <h4 className="font-bold text-slate-800 dark:text-white mb-2 truncate group-hover:text-indigo-500 transition-colors">
                {t.subject}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 mb-6">
                {t.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100/50 dark:border-slate-800/50">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-slate-900">DL</div>
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                    <i className="fas fa-user text-[8px] text-slate-400" />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  <i className="fas fa-history mr-1" />
                  {new Date(t.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      <TicketChatModal 
        ticket={selectedTicket} 
        open={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)}
        currentUserId={tickets.find(t => t.id === selectedTicket?.id)?.agency_id || null}
      />
    </div>
  );
}
