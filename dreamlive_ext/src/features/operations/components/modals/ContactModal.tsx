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
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SISTEMA] Motor de mensajería listo...', '[INFO] Esperando apertura de chat de TikTok...']);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [invitationTypes, setInvitationTypes] = useState<string[]>(["Normal", "Elite", "Popular", "Premium"]);
  
  const isValidRoute = location.href.includes('/instant-messages');

  useEffect(() => {
    browser.storage.local.get(['contact_position', 'cachedCounts', 'messageTemplates', 'invitationTypes']).then((res: any) => {
      const pos = res?.contact_position as { x: number; y: number } | undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        setPosition(pos);
      }
      if (res?.cachedCounts && typeof res.cachedCounts.DISPONIBILIDAD === 'number') {
        setTotal(res.cachedCounts.DISPONIBILIDAD);
      }

      // First fetch from background/API
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
        }
      }).catch((e) => {
        console.error('Error getting message config:', e);
        if (res?.messageTemplates) setTemplates(res.messageTemplates);
        if (res?.invitationTypes) setInvitationTypes(res.invitationTypes);
      });
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
  }, []);

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
        pointerEvents: 'auto', width: showTemplates ? '440px' : '360px',
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
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--apple-text-main)', letterSpacing: '-0.3px' }}>
                Contactar
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: isValidRoute ? 'var(--color-purple)' : 'var(--apple-text-sub)', marginTop: '1px' }}>
                {isValidRoute ? 'MENSAJERÍA LISTA' : 'ESPERANDO CHAT...'}
              </span>
            </div>
            <div className="dreamlive-header-actions" style={{ gap: '8px' }}>
              <button 
                onClick={toggleConsole}
                className="dreamlive-icon-btn" 
                style={{ background: showConsole ? 'var(--color-purple)' : 'var(--apple-btn-secondary)', color: showConsole ? '#FFF' : 'var(--apple-text-main)' }}
              >
                <Terminal size={14} />
              </button>
              <button onClick={onClose} className="dreamlive-icon-btn"><X size={16} /></button>
            </div>
          </div>

          {/* Body */}
          <div className="dreamlive-modal-body" style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {showTemplates ? (
              <TemplateManager 
                templates={templates} 
                invitationTypes={invitationTypes}
                onConfigChange={handleConfigChange}
                isDarkMode={true} 
              />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  <div 
                    style={{ 
                      width: '80px', height: '80px', borderRadius: '50%', 
                      border: `4px solid ${isRunning ? 'var(--color-purple)' : 'var(--apple-btn-secondary)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      boxShadow: isRunning ? '0 0 15px rgba(175, 82, 222, 0.2)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--apple-text-main)', lineHeight: '1.2' }}>{count}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--apple-text-sub)' }}>/ {total || '-'}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--apple-bg-secondary)', padding: '12px', borderRadius: '12px', marginBottom: '4px', border: '1px solid var(--apple-border)' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--apple-text-sub)', textAlign: 'center', lineHeight: '1.4' }}>
                    Inicia el envío automático de mensajes a tus leads capturados desde la sección de chat.
                  </p>
                </div>
              </>
            )}

            <div className="dreamlive-button-group" style={{ gap: '10px' }}>
              {!showTemplates && (
                <button 
                  disabled={!isValidRoute}
                  onClick={async () => {
                    const chatService = ChatAutomationService.getInstance();
                    if (isRunning) {
                      chatService.abort();
                    } else {
                      try {
                        const res = await browser.runtime.sendMessage({ type: 'GET_LEADS_FOR_CONTACTING' });
                        if (res && res.success && res.leads && res.leads.length > 0) {
                          chatService.start(res.leads, res.templates, res.targetSuccessCount);
                        } else {
                          setLogs(prev => [...prev, '[INFO] No hay leads disponibles para contactar.']);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="dreamlive-btn"
                  style={{ 
                    background: !isValidRoute ? 'var(--apple-btn-disabled)' : isRunning ? '#FF3B30' : 'var(--color-purple)', 
                    color: !isValidRoute ? 'var(--apple-text-disabled)' : '#FFFFFF',
                    height: '42px',
                    cursor: !isValidRoute ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={16} fill="currentColor" />
                  <span>{isRunning ? 'Detener Envío' : 'Iniciar Envío Masivo'}</span>
                </button>
              )}
              
              <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className="dreamlive-btn" 
                style={{ 
                  background: showTemplates ? 'var(--color-purple)' : 'var(--apple-btn-secondary)', 
                  color: showTemplates ? '#FFFFFF' : 'var(--apple-text-main)', 
                  height: '42px' 
                }}
              >
                <Settings size={16} />
                <span>{showTemplates ? 'Volver a Envío' : 'Configuración de Mensaje'}</span>
              </button>

              {!showTemplates && (
                <button
                  onClick={async () => {
                    await browser.storage.local.set({ activeOperationsModal: 'HISTORY_CONTACTAR' });
                  }}
                  className="dreamlive-btn"
                  style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '42px', marginTop: '4px' }}
                >
                  <Database size={16} />
                  <span>Historial</span>
                </button>
              )}
            </div>
          </div>

          {/* Console Area */}
          {showConsole && (
            <div style={{ 
              borderTop: '1px solid var(--apple-border)',
              background: '#000',
              padding: '12px',
              maxHeight: '120px',
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
