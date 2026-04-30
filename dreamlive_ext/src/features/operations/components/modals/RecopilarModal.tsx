import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Terminal, UserPlus, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { browser } from 'wxt/browser';

interface Props {
  onClose: () => void;
  isDarkMode?: boolean;
}

export const RecopilarModal: React.FC<Props> = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SISTEMA] Motor de extracción listo...', '[INFO] Esperando señal de TikTok Live...']);

  useEffect(() => {
    browser.storage.local.get('recopilar_position').then((res) => {
      const pos = res.recopilar_position as { x: number; y: number } | undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        setPosition(pos);
      }
    });
  }, []);

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
        browser.storage.local.set({ recopilar_position: position });
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

  const handleOpenHistory = async () => {
    await browser.storage.local.set({ activeOperationsModal: 'HISTORY_RECOPILAR' });
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
                Extracción
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-blue)', marginTop: '1px' }}>
                {isRunning ? 'EN EJECUCIÓN' : 'ESPERANDO LIVE...'}
              </span>
            </div>
            <div className="dreamlive-header-actions" style={{ gap: '8px' }}>
              <button 
                onClick={toggleConsole}
                className="dreamlive-icon-btn" 
                style={{ background: showConsole ? 'var(--color-blue)' : 'var(--apple-btn-secondary)', color: showConsole ? '#FFF' : 'var(--apple-text-main)' }}
              >
                <Terminal size={14} />
              </button>
              <button onClick={onClose} className="dreamlive-icon-btn"><X size={16} /></button>
            </div>
          </div>

          {/* Body */}
          <div className="dreamlive-modal-body" style={{ padding: '20px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div 
                style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', 
                  border: `4px solid ${isRunning ? 'var(--color-blue)' : 'var(--apple-btn-secondary)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: isRunning ? '0 0 15px rgba(0, 122, 255, 0.2)' : 'none'
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--apple-text-main)' }}>{count}</span>
              </div>
            </div>

            <div style={{ background: 'var(--apple-bg-secondary)', padding: '12px', borderRadius: '12px', marginBottom: '18px', border: '1px solid var(--apple-border)' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--apple-text-sub)', textAlign: 'center', lineHeight: '1.4' }}>
                Entra en un Live de TikTok para comenzar a detectar usuarios automáticamente.
              </p>
            </div>

            <div className="dreamlive-button-group" style={{ gap: '10px' }}>
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className="dreamlive-btn"
                style={{ 
                  background: isRunning ? '#FF3B30' : 'var(--color-blue)', 
                  color: '#FFFFFF',
                  height: '42px'
                }}
              >
                {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span>{isRunning ? 'Detener Servicio' : 'Iniciar Extracción'}</span>
              </button>
              
              <button 
                onClick={handleOpenHistory}
                className="dreamlive-btn"
                style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '42px' }}
              >
                <UserPlus size={16} />
                <span>Ver Historial de Leads</span>
              </button>
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
                <Terminal size={10} color="#00FF00" />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#00FF00', textTransform: 'uppercase' }}>Consola de Eventos</span>
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
