import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Terminal, Database, ShieldCheck, ShieldAlert } from 'lucide-react';
import { browser } from 'wxt/browser';
import { availabilityScraper, ScraperLogType } from '../../services/availability-scraper.service';
import { SCRAPER_DEFAULT_TAGS } from '../../../shared/constants';

interface Props {
  onClose: () => void;
  isDarkMode?: boolean;
}

const TAGS = SCRAPER_DEFAULT_TAGS;

export const AvailabilityModal: React.FC<Props> = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 320, y: 90 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [isRunning, setIsRunning] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>(SCRAPER_DEFAULT_TAGS);
  const [progress, setProgress] = useState({ currentTotal: 0, total: 0, currentBatch: 0, totalBatch: 0 });
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<{ msg: string, type: ScraperLogType }[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const isValidRoute = window.location.href.includes('/portal/anchor/relation');

  useEffect(() => {
    browser.storage.local.get(['availability_position', 'cachedCounts']).then((res: any) => {
      const pos = res?.availability_position as { x: number; y: number } | undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') setPosition(pos);
      // Para disponibilidad, el total de la operación es el número de leads RECOPILADOS
      if (res?.cachedCounts && typeof res.cachedCounts.RECOPILAR === 'number') {
        setProgress(prev => ({ ...prev, total: res.cachedCounts.RECOPILAR }));
      }
    });

    // Cargar configuración inicial de la base de datos
    browser.runtime.sendMessage({ type: 'GET_INVITATION_CONFIG' }).then((res: any) => {
      if (res && res.invitation_types) {
        setActiveTags(res.invitation_types);
      }
    });

    // Configurar el servicio
    availabilityScraper.setCallbacks({
      onLog: (msg, type = "info") => setLogs(prev => [...prev.slice(-49), { msg, type }]),
      onProgress: (currentTotal, total, currentBatch, totalBatch) =>
        setProgress({ currentTotal, total, currentBatch, totalBatch }),
      onStatusChange: (running) => setIsRunning(running)
    });
  }, []);

  // Función para guardar cambios en la DB
  const saveTagsToDb = async (tags: string[]) => {
    try {
      await browser.runtime.sendMessage({
        type: 'SAVE_INVITATION_CONFIG',
        invitation_types: tags
      });
    } catch (e) {
      console.error('Error guardando etiquetas:', e);
    }
  };

  const toggleTag = (tag: string) => {
    if (isRunning) return;
    const newTags = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];

    if (newTags.length === 0) return; // Evitar quedarse sin filtros

    setActiveTags(newTags);
    saveTagsToDb(newTags);
  };

  useEffect(() => {
    if (showConsole) consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, showConsole]);

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
        browser.storage.local.set({ availability_position: position });
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

  const toggleAction = () => {
    if (isRunning) {
      availabilityScraper.stop();
    } else {
      availabilityScraper.setTags(activeTags); // Pasamos el array de tags
      availabilityScraper.start();
    }
  };

  return (
    <div
      style={{
        position: 'fixed', zIndex: 2147483646,
        top: `${position.y}px`, left: `${position.x}px`,
        pointerEvents: 'auto', width: '340px'
      }}
    >
      <div className="dreamlive-modal-container">
        <div className="dreamlive-modal-card" style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.15)' }}>
          {/* Header */}
          <div
            onMouseDown={handleMouseDown}
            className="dreamlive-modal-header"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', padding: '10px 14px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="dreamlive-title-main">Disponibilidad</span>
                {isValidRoute ? (
                  <ShieldCheck size={14} color="#34C759" />
                ) : (
                  <ShieldAlert size={14} color="#FF3B30" />
                )}
              </div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: isRunning ? 'var(--color-primary)' : 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {isRunning ? 'ESCANEANDO MOTOR...' : 'SISTEMA LISTO'}
              </span>
            </div>

            <div className="dreamlive-header-actions">
              <button
                onClick={() => setShowConsole(!showConsole)}
                title="Mostrar/Ocultar consola"
                className="dreamlive-icon-btn"
                style={{
                  background: showConsole ? 'var(--color-primary)' : 'var(--apple-btn-secondary)',
                  color: showConsole ? '#FFF' : 'var(--apple-text-main)',
                  boxShadow: showConsole ? '0 0 12px rgba(20, 115, 116, 0.3)' : 'none'
                }}
              >
                <Terminal size={14} />
              </button>
              <button onClick={onClose} className="dreamlive-icon-btn"><X size={16} /></button>
            </div>
          </div>

          {/* Tag Selector (Apple Badges Múltiples) */}
          <div style={{ padding: '0 14px 10px 14px', display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TAGS.map(tag => {
              const isSelected = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: isSelected ? 'var(--color-primary-gradient)' : 'var(--apple-btn-secondary)',
                    color: isSelected ? '#FFF' : 'var(--apple-text-main)',
                    opacity: isRunning && !isSelected ? 0.5 : 1,
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isSelected ? '0 4px 10px rgba(20, 115, 116, 0.2)' : 'none'
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="dreamlive-modal-body" style={{ padding: '0 14px 16px 14px' }}>
            {/* Medición Doble de Progreso */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
              <div
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  border: `3px solid ${isRunning ? 'var(--color-primary)' : 'var(--apple-btn-secondary)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isRunning ? '0 0 20px rgba(20, 115, 116, 0.3)' : 'none',
                  background: 'var(--apple-bg)'
                }}
              >
                <span style={{ fontSize: '22px', fontVariantNumeric: 'tabular-nums', fontWeight: '900', color: 'var(--apple-text-main)' }}>
                  {progress.currentTotal}
                </span>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--apple-text-sub)', letterSpacing: '0.5px' }}>
                  / {progress.total || '-'}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Progreso Global
              </span>

              {/* Lote actual */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--apple-bg-secondary)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)', width: '100%', maxWidth: '160px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                  Lote actual
                </span>
                <span style={{ fontSize: '16px', fontVariantNumeric: 'tabular-nums', fontWeight: '900', color: 'var(--apple-text-main)' }}>
                  {progress.currentBatch} / {progress.totalBatch || '-'}
                </span>
              </div>
            </div>

            {!isValidRoute && (
              <div style={{ background: 'rgba(255, 59, 48, 0.05)', padding: '12px', borderRadius: '14px', marginBottom: '20px', border: '1px solid rgba(255, 59, 48, 0.1)' }}>
                <p style={{ fontSize: '11px', fontWeight: '800', color: '#FF3B30', textAlign: 'center', lineHeight: '1.4' }}>
                  ⚠️ Navega a "Relation Management" para activar el motor.
                </p>
              </div>
            )}

            <div className="dreamlive-button-group" style={{ gap: '12px' }}>
              <button
                onClick={toggleAction}
                disabled={!isValidRoute && !isRunning}
                className="dreamlive-btn"
                style={{
                  background: isRunning ? '#FF3B30' : isValidRoute ? 'var(--color-primary-gradient)' : 'var(--apple-btn-disabled)',
                  color: '#FFFFFF',
                  height: '40px',
                  boxShadow: isRunning ? '0 4px 15px rgba(255, 59, 48, 0.2)' : (isValidRoute ? '0 4px 15px rgba(20, 115, 116, 0.25)' : 'none')
                }}
              >
                <Search size={18} strokeWidth={2.5} />
                <span style={{ fontWeight: '800' }}>{isRunning ? 'Detener Escaneo' : 'Iniciar Escaneo'}</span>
              </button>

              <button
                onClick={async () => {
                  availabilityScraper.stop();
                  await browser.storage.local.set({ activeOperationsModal: 'HISTORY_DISPONIBILIDAD' });
                }}
                className="dreamlive-btn"
                style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '40px', border: '1px solid var(--apple-border)' }}
              >
                <Database size={18} />
                <span style={{ fontWeight: '800' }}>Historial</span>
              </button>
            </div>
          </div>

          {/* Console Area */}
          {showConsole && (
            <div style={{
              borderTop: '1px solid var(--apple-border)',
              background: '#1C1C1E',
              padding: '10px',
              maxHeight: '80px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isRunning ? '#28CD41' : '#FF3B30' }} />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#A1A1A6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Logs Output
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {logs.map((log, i) => (
                  <div key={i} style={{
                    fontSize: '10px',
                    color: log.type === 'success' ? '#28CD41' : log.type === 'error' ? '#FF3B30' : '#FFF',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    lineHeight: '1.4',
                    borderLeft: `2px solid ${log.type === 'success' ? '#28CD41' : log.type === 'error' ? '#FF3B30' : '#48484A'}`,
                    paddingLeft: '6px'
                  }}>
                    {log.msg}
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
