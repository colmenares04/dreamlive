import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Terminal, Database } from 'lucide-react';
import { browser } from 'wxt/browser';

interface Props {
  onClose: () => void;
  isDarkMode?: boolean;
}

export const AvailabilityModal: React.FC<Props> = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 320, y: 90 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [count, setCount] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SISTEMA] Escáner de disponibilidad listo...', '[INFO] Cargando base de datos de leads...']);

  useEffect(() => {
    browser.storage.local.get('availability_position').then((res) => {
      const pos = res.availability_position as { x: number; y: number } | undefined;
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

  const toggleConsole = () => setShowConsole(!showConsole);

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
                Disponibilidad
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-blue)', marginTop: '1px' }}>
                {isScanning ? 'ESCANEANDO...' : 'SISTEMA LISTO'}
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
                  border: `4px solid ${isScanning ? 'var(--color-blue)' : 'var(--apple-btn-secondary)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: isScanning ? '0 0 15px rgba(0, 122, 255, 0.2)' : 'none'
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--apple-text-main)' }}>{count}</span>
              </div>
            </div>

            <div style={{ background: 'var(--apple-bg-secondary)', padding: '12px', borderRadius: '12px', marginBottom: '18px', border: '1px solid var(--apple-border)' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--apple-text-sub)', textAlign: 'center', lineHeight: '1.4' }}>
                Verifica cuáles de tus leads están conectados actualmente a TikTok.
              </p>
            </div>

            <div className="dreamlive-button-group" style={{ gap: '10px' }}>
              <button 
                onClick={() => setIsScanning(!isScanning)}
                className="dreamlive-btn"
                style={{ 
                  background: isScanning ? '#FF3B30' : 'var(--color-blue)', 
                  color: '#FFFFFF',
                  height: '42px'
                }}
              >
                <Search size={16} strokeWidth={2.5} />
                <span>{isScanning ? 'Detener Escaneo' : 'Escanear Lote'}</span>
              </button>
              
              <button className="dreamlive-btn" style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '42px' }}>
                <Database size={16} />
                <span>Ver en Dashboard</span>
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
                <Terminal size={10} color="#007AFF" />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#007AFF', textTransform: 'uppercase' }}>Logs de Disponibilidad</span>
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
