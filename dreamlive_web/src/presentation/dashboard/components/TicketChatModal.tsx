/**
 * TicketChatModal - Premium Support Center 2.0
 * Rediseño de alta gama con layout de doble columna y estética Glassmorphism.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Modal, Badge } from '../../shared';
import { TicketsAdapter } from '../../../services';
import { useChat } from '../../../hooks/useChat';
import { useWebNotifications } from '../../../hooks/useWebNotifications';
import type { Ticket } from '../../../core/entities/settings';

interface Props {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
  currentUserId: string | null;
  onStatusChange?: (ticket: Ticket, status: string) => Promise<void>;
  isAdmin?: boolean;
}

export function TicketChatModal({ ticket, open, onClose, currentUserId, onStatusChange, isAdmin }: Props) {
  const { messages, setMessages, sendMessage, connected } = useChat(ticket?.id || null);
  const { notifyNewMessage, requestPermission } = useWebNotifications();
  const [text, setText] = useState('');
  const [updating, setUpdating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar historial inicial
  useEffect(() => {
    if (open && ticket?.id) {
      TicketsAdapter.getHistory(ticket.id).then(setMessages);
      requestPermission(); // Aseguramos que el usuario pueda recibir alertas
    }
  }, [open, ticket?.id, setMessages, requestPermission]);

  // Scroll al final y notificaciones
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.user_id !== currentUserId && document.hidden) {
      notifyNewMessage('Ticket: ' + (ticket?.subject || 'DreamLive'), lastMsg.message);
    }
  }, [messages, currentUserId, notifyNewMessage, ticket?.subject]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text);
    setText('');
  };

  const handleStatus = async (status: string) => {
    if (!ticket) return;
    setUpdating(true);
    try {
      await onStatusChange?.(ticket, status);
    } finally {
      setUpdating(false);
    }
  };

  if (!ticket) return null;

  return (
    <Modal open={open} onClose={onClose} title={ticket.subject || 'Centro de Soporte'} size="xl">
      <div className="flex h-[75vh] min-h-[600px] overflow-hidden bg-slate-50 dark:bg-slate-950/20">
        
        {/* ── COLUMNA IZQUIERDA: DETALLES ────────────────────────────────────────── */}
        <div className="w-[320px] shrink-0 border-r border-border/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-8 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
            
            {/* ID & Status */}
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Expediente</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black tracking-tight">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                <Badge variant={ticket.status === 'open' ? 'blue' : ticket.status === 'closed' ? 'gray' : 'green'}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Acciones de Gestión (Admin Only) */}
            {isAdmin && (
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 text-center">Acciones de Operador</p>
                <div className="flex flex-col gap-2">
                  {ticket.status === 'open' && (
                    <Button variant="primary" size="sm" className="w-full !rounded-xl !text-[10px]" onClick={() => handleStatus('in_progress')} loading={updating}>Tomar Caso</Button>
                  )}
                  {ticket.status === 'in_progress' && (
                    <Button variant="success" size="sm" className="w-full !rounded-xl !text-[10px]" onClick={() => handleStatus('resolved')} loading={updating}>Suelto</Button>
                  )}
                  {ticket.status === ('closed' as string) ? (
                    <Button variant="indigo" size="sm" className="w-full !rounded-xl !text-[10px]" onClick={() => handleStatus('open')} loading={updating}>Reabrir Ticket</Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full !rounded-xl !text-[10px]" onClick={() => handleStatus('closed')} loading={updating}>Cerrar Ticket</Button>
                  )}
                </div>
              </div>
            )}

            {/* Requerimiento Original */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Requerimiento</p>
              <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 shadow-sm">
                <p className="text-sm font-semibold text-foreground/80 leading-relaxed italic">
                  "{ticket.description}"
                </p>
              </div>
            </div>

            {/* Información de Ayuda */}
            <div className="p-4 bg-muted/40 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <i className="fas fa-info-circle text-indigo-500 text-xs" />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground/70 leading-normal">
                  Nuestro equipo revisará tu caso en un plazo máximo de 24 horas. Mantén abierta esta ventana para chat en vivo.
                </p>
              </div>
            </div>
          </div>

          {/* Footer del Sidebar */}
          <div className="pt-6 mt-auto">
            <Button 
              variant="outline" 
              full 
              onClick={onClose} 
              className="!border-border/60 !rounded-2xl !text-[10px] !font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Cerrar Vista
            </Button>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: CHAT AREA ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/20">
          
          {/* Cabecera del Chat */}
          <div className="shrink-0 p-6 border-b border-border/40 flex items-center justify-between bg-white dark:bg-slate-900">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <i className="fas fa-headset text-white text-lg" />
               </div>
               <div>
                 <h4 className="font-black text-lg tracking-tighter leading-none mb-1">Centro de Mensajería</h4>
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                     {connected ? 'Canal Directo Activo' : 'Sincronizando Enlace...'}
                   </span>
                 </div>
               </div>
             </div>
          </div>

          {/* Área de Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-border shadow-inner">
                  <i className="fas fa-paper-plane text-4xl text-muted-foreground/30 -rotate-12" />
                </div>
                <h5 className="text-sm font-black uppercase tracking-[0.3em] mb-2">Canal Establecido</h5>
                <p className="text-[11px] font-bold text-center max-w-[200px] leading-relaxed uppercase opacity-60">
                  No hay mensajes previos. Escribe algo para iniciar.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.user_id === currentUserId;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`group relative max-w-[75%] p-5 rounded-3xl shadow-sm transition-all hover:shadow-md ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10' 
                        : 'bg-white dark:bg-slate-800 text-foreground border border-border/60 rounded-tl-none'
                    }`}>
                      <p className="text-sm font-semibold leading-relaxed tracking-tight">{m.message}</p>
                      <div className={`mt-3 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity ${isMe ? 'justify-end' : ''}`}>
                        <i className={`fas ${isMe ? 'fa-check-double' : 'fa-clock'} text-[8px]`} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input de Mensaje */}
          <div className="shrink-0 p-8 pt-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-t border-border/40">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!connected || ticket.status === 'closed'}
                placeholder={ticket.status === 'closed' ? "Conversación cerrada por el operador" : "Escribe tu mensaje aquí..."}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-[1.5rem] pl-8 pr-16 py-6 text-sm font-bold shadow-inner focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-muted-foreground/30 placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px]"
              />
              <button 
                type="submit" 
                disabled={!connected || !text.trim() || ticket.status === 'closed'}
                className="absolute right-3 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all active:scale-90"
              >
                <i className="fas fa-arrow-up text-lg" />
              </button>
            </form>
            <div className="flex items-center justify-center gap-6 mt-4">
               <div className="flex items-center gap-2 opacity-20">
                 <i className="fas fa-lock text-[8px]" />
                 <span className="text-[8px] font-black uppercase tracking-[0.2em]">Cifrado de extremo a extremo</span>
               </div>
               <div className="flex items-center gap-2 opacity-20">
                 <i className="fas fa-bolt text-[8px]" />
                 <span className="text-[8px] font-black uppercase tracking-[0.2em]">Protocolo Real-Time v4</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}
