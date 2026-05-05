import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Terminal, Settings, Database, Eye } from 'lucide-react';
import { browser } from 'wxt/browser';
import { TemplateManager } from './TemplateManager';

import { ChatAutomationService } from '../../services/chat-automation.service';

interface Props {
  onClose: () => void;
  isDarkMode?: boolean;
}

export const ContactModal: React.FC<Props> = ({ onClose, isDarkMode = false }) => {
  const [position, setPosition] = useState({ x: 320, y: 90 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [requestLimit, setRequestLimit] = useState(60);
  const [refreshMinutes, setRefreshMinutes] = useState(60);
  const [resetIn, setResetIn] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SISTEMA] Motor de mensajería listo...', '[INFO] Esperando apertura de chat de TikTok...']);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [invitationTypes, setInvitationTypes] = useState<string[]>(["Normal", "Elite", "Popular", "Premium"]);

  const isValidRoute = location.href.includes('/instant-messages');

  const fetchLimits = useCallback(async () => {
    try {
      const res = await browser.runtime.sendMessage({ type: 'GET_LIMITS' });
      if (res && res.success) {
        setDailyUsed(res.count);
        setRequestLimit(res.limit);
        setResetIn(res.reset_in);
      }
    } catch (e) {
      console.error('Error fetching limits:', e);
    }
  }, []);

  useEffect(() => {
    browser.storage.local.get(['contact_position', 'cachedCounts', 'messageTemplates', 'invitationTypes']).then((res: any) => {
      const pos = res?.contact_position as { x: number; y: number } | undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        setPosition(pos);
      }
      if (res?.cachedCounts && typeof res.cachedCounts.DISPONIBILIDAD === 'number') {
        setTotal(res.cachedCounts.DISPONIBILIDAD);
      }

      browser.runtime.sendMessage({ type: 'GET_INVITATION_CONFIG' }).then((configRes: any) => {
        if (configRes) {
          if (configRes.message_templates && configRes.message_templates.length > 0) {
            setTemplates(configRes.message_templates);
            browser.storage.local.set({ messageTemplates: configRes.message_templates });
          } else if (res?.messageTemplates) {
            setTemplates(res.messageTemplates);
          } else {
            setTemplates(['¡Hola {username}, me encanta tu contenido!']);
          }

          if (configRes.invitation_types && configRes.invitation_types.length > 0) {
            setInvitationTypes(configRes.invitation_types);
            browser.storage.local.set({ invitationTypes: configRes.invitation_types });
          } else if (res?.invitationTypes) {
            setInvitationTypes(res.invitationTypes);
          }

          if (configRes.request_limit) setRequestLimit(configRes.request_limit);
          if (configRes.refresh_minutes) setRefreshMinutes(configRes.refresh_minutes);
        }
      }).catch((e) => {
        console.error('Error getting message config:', e);
        if (res?.messageTemplates) setTemplates(res.messageTemplates);
        if (res?.invitationTypes) setInvitationTypes(res.invitationTypes);
      });

      fetchLimits();
    });

    const chatService = ChatAutomationService.getInstance();
    chatService.setCallbacks({
      onLog: (msg, type = "info") => setLogs(prev => [...prev.slice(-49), `[${type.toUpperCase()}] ${msg}`]),
      onProgress: (current, totalCount) => {
        setCount(current);
        if (totalCount > 0) setTotal(totalCount);
      },
      onStatusChange: (running) => setIsRunning(running)
    });
  }, [fetchLimits]);

  // Live update listener for ContactModal
  useEffect(() => {
    const handleMessage = (msg: any) => {
      // Escuchamos tanto LEAD_CONTACTED_SUCCESS como MARK_CONTACTED
      if ((msg.type === 'LEAD_CONTACTED_SUCCESS' || msg.type === 'MARK_CONTACTED') && msg.internalBroadcast) {
        console.log('[ContactModal] 📥 Live counter update received:', msg);
        setDailyUsed(prev => {
          const next = prev + 1;
          console.log(`[ContactModal] 📈 Updating counter: ${prev} -> ${next} / ${requestLimit}`);
          // Activar cuenta atrás local si llegamos al límite
          if (next >= requestLimit && resetIn <= 0) {
            console.log('[ContactModal] ⏱️ Limit reached, starting local countdown');
            setResetIn(300); // 5 min fallback
          }
          return next;
        });
      }
    };
    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [requestLimit, resetIn]);

  // Real-time countdown for ContactModal
  useEffect(() => {
    if (resetIn > 0) {
      const timer = setInterval(() => {
        setResetIn(prev => (prev <= 0 ? 0 : prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resetIn]);

  const handleConfigChange = async (newTemplates: string[], newInvitationTypes: string[]) => {
    setTemplates(newTemplates);
    setInvitationTypes(newInvitationTypes);
    await browser.storage.local.set({
      messageTemplates: newTemplates,
      invitationTypes: newInvitationTypes
    });
    await browser.runtime.sendMessage({
      type: 'SAVE_MESSAGE_TEMPLATES',
      message_templates: newTemplates,
      invitation_types: newInvitationTypes
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        browser.storage.local.set({ contact_position: position });
      }
    };
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  const toggleConsole = () => setShowConsole(!showConsole);

  return (
    <div
      style={{
        position: 'fixed', zIndex: 2147483646,
        top: `${position.y}px`, left: `${position.x}px`,
        pointerEvents: 'auto', width: showTemplates ? '440px' : '340px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="dreamlive-modal-container">
        <div className="dreamlive-modal-card">
          {/* Header */}
          <div
            onMouseDown={handleMouseDown}
            className="dreamlive-modal-header"
            style={{
              padding: '16px 18px',
              cursor: isDragging ? 'grabbing' : 'grab',
              borderBottom: showConsole ? '1px solid var(--apple-border)' : 'none'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dreamlive-title-main">Contactar</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                color: isValidRoute ? 'var(--color-primary)' : 'var(--color-red)',
                marginTop: '2px',
                letterSpacing: '0.5px'
              }}>
                {isValidRoute ? 'MENSAJERÍA LISTA' : 'ESPERANDO CHAT...'}
              </span>
            </div>
            <div className="dreamlive-header-actions" style={{ gap: '10px' }}>
              <button
                onClick={toggleConsole}
                className="dreamlive-icon-btn"
                title="Terminal: Abre la consola técnica para ver el progreso detallado de los envíos en tiempo real"
                style={{
                  background: showConsole ? 'var(--color-primary)' : 'var(--apple-btn-secondary)',
                  color: showConsole ? '#FFF' : 'var(--apple-text-main)',
                  boxShadow: showConsole ? '0 0 12px rgba(20, 115, 116, 0.3)' : 'none'
                }}
              >
                <Terminal size={14} />
              </button>
              <button
                onClick={onClose}
                className="dreamlive-icon-btn"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="dreamlive-modal-body" style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {showTemplates ? (
              <TemplateManager
                templates={templates}
                invitationTypes={invitationTypes}
                onConfigChange={handleConfigChange}
                isDarkMode={isDarkMode}
              />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                  <div
                    className="dreamlive-circle-main"
                    style={{
                      borderColor: isRunning ? 'var(--color-primary)' : 'var(--apple-border)',
                      boxShadow: isRunning ? '0 0 20px rgba(20, 115, 116, 0.2)' : 'var(--apple-shadow)'
                    }}
                  >
                    <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--apple-text-main)', letterSpacing: '-1px' }}>{count}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--apple-text-sub)', marginTop: '-2px' }}>/ {total || '-'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Límite Diario</span>
                    <span className="dreamlive-badge badge-active" style={{ fontSize: '12px', padding: '3px 12px' }}>
                      {dailyUsed} / {requestLimit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Reinicio</span>
                    <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', fontWeight: '800', color: resetIn > 0 ? 'var(--color-primary)' : 'var(--apple-text-main)' }}>
                      {resetIn > 0 ? (
                        `${Math.floor(resetIn / 60)}:${(resetIn % 60).toString().padStart(2, '0')}`
                      ) : (
                        'Listo'
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'var(--apple-bg-secondary)', padding: '10px', borderRadius: '14px', border: '1px solid var(--apple-border)' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--apple-text-sub)', textAlign: 'center', lineHeight: '1.4' }}>
                    Inicia el envío automático de mensajes a tus leads capturados. Asegúrate de estar en la pestaña de chat.
                  </p>
                </div>
              </>
            )}

            <div className="dreamlive-button-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!showTemplates && (
                <button
                  disabled={!isValidRoute}
                  title={!isValidRoute ? "Debes estar en la página de mensajes de TikTok Backstage para iniciar" : isRunning ? "Detener proceso de envío masivo" : "Iniciar envío automático de mensajes a leads disponibles"}
                  onClick={async () => {
                    const chatService = ChatAutomationService.getInstance();
                    if (isRunning) {
                      chatService.abort();
                    } else {
                      try {
                        const res = await browser.runtime.sendMessage({ type: 'GET_LEADS_FOR_CONTACTING' });
                        if (res && res.success && res.leads && res.leads.length > 0) {
                          if (res.totalInDb > 0) setTotal(res.totalInDb);
                          chatService.start(res.leads, res.templates, res.targetSuccessCount, res.totalInDb || 0);
                        } else {
                          setLogs(prev => [...prev, '[INFO] No hay leads disponibles para contactar.']);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="dreamlive-btn dreamlive-btn-primary"
                  style={{
                    background: !isValidRoute ? 'var(--apple-btn-disabled)' : isRunning ? 'var(--color-red)' : 'var(--color-primary-gradient)',
                    height: '38px',
                    opacity: !isValidRoute ? 0.5 : 1
                  }}
                >
                  <Send size={20} fill="currentColor" />
                  <span style={{ letterSpacing: '-0.3px' }}>{isRunning ? 'Detener Envío' : 'Iniciar Envío Masivo'}</span>
                </button>
              )}

              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="dreamlive-btn"
                title="Configuración: Administra tus plantillas de mensajes y etiquetas de invitación"
                style={{
                  background: showTemplates ? 'var(--color-primary-gradient)' : 'var(--apple-btn-secondary)',
                  color: showTemplates ? '#FFFFFF' : 'var(--apple-text-main)',
                  height: '38px'
                }}
              >
                <Settings size={18} />
                <span>{showTemplates ? 'Volver a Envío' : 'Configuración de Mensaje'}</span>
              </button>

              {!showTemplates && (
                <button
                  onClick={async () => {
                    ChatAutomationService.getInstance().abort();
                    await browser.storage.local.set({ activeOperationsModal: 'HISTORY_CONTACTAR' });
                  }}
                  title="Historial: Revisa los leads que ya han sido contactados anteriormente"
                  className="dreamlive-btn"
                  style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '36px' }}
                >
                  <Database size={18} />
                  <span>Historial de Contacto</span>
                </button>
              )}
            </div>
          </div>

          {/* Console Area */}
          {showConsole && (
            <div style={{
              borderTop: '1px solid var(--apple-border)',
              background: '#000',
              padding: '10px',
              maxHeight: '80px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Terminal size={10} color="#AF52DE" />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#AF52DE', textTransform: 'uppercase' }}>Logs de Mensajería</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ fontSize: '10px', color: '#A1A1A6', fontFamily: 'monospace' }}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
