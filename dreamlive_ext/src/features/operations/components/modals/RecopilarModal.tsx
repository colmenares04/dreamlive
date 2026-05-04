import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Terminal, UserPlus, Hash, Plus, Trash2, ArrowRight } from 'lucide-react';
import { browser } from 'wxt/browser';
import { tiktokScraper } from '../../services/tiktok-scraper.service';
import { KeywordsService } from '../../services/keywords.service';

interface Props {
  onClose: () => void;
  isDarkMode?: boolean;
}

export const RecopilarModal: React.FC<Props> = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Estados del Motor
  const [isRunning, setIsRunning] = useState(tiktokScraper.getIsRunning());
  const [count, setCount] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Estados de Keywords (UI Apple)
  const [showKeywordMenu, setShowKeywordMenu] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [activeKeyword, setActiveKeyword] = useState('cargando...');
  const [newKeyword, setNewKeyword] = useState('');
  const [globalTotal, setGlobalTotal] = useState(0);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showConsole) consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, showConsole]);

  const keywordsRef = useRef<string[]>([]);
  const activeKeywordRef = useRef<string>(activeKeyword);

  useEffect(() => {
    keywordsRef.current = keywords;
    activeKeywordRef.current = activeKeyword;
  }, [keywords, activeKeyword]);

  const loadKeywords = async () => {
    const k = await KeywordsService.getKeywords();
    const a = await KeywordsService.getActiveKeyword();
    setKeywords(k);
    setActiveKeyword(a);

    // Cargar total global desde el caché de métricas
    const res: any = await browser.storage.local.get('cachedCounts');
    if (res.cachedCounts && typeof res.cachedCounts.RECOPILAR === 'number') {
      setGlobalTotal(res.cachedCounts.RECOPILAR);
    }
  };

  useEffect(() => {
    // Forzar actualización de métricas nada más abrir para evitar el guion "-"
    browser.runtime.sendMessage({ type: 'REFRESH_METRICS' }).catch(() => {});

    browser.storage.local.get(['recopilar_position', 'cachedCounts']).then((res: any) => {
      const pos = res.recopilar_position as { x: number; y: number } | undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') setPosition(pos);
      if (res.cachedCounts && typeof res.cachedCounts.RECOPILAR === 'number') {
        setGlobalTotal(res.cachedCounts.RECOPILAR);
      }
    });

    tiktokScraper.setCallbacks({
      onLog: (msg: string) => setLogs(prev => [...prev.slice(-49), msg]),
      onCountChange: (newCount: number) => setCount(newCount),
      onStatusChange: (active: boolean) => setIsRunning(active),
      onRotate: () => {
        const currentKeywords = keywordsRef.current;
        const currentActive = activeKeywordRef.current;

        if (currentKeywords.length <= 1) return;

        const currentIndex = currentKeywords.indexOf(currentActive);
        const nextIndex = (currentIndex + 1) % currentKeywords.length;
        const nextK = currentKeywords[nextIndex];

        tiktokScraper.log(`Nicho agotado. Saltando automáticamente a: "${nextK}"`);
        handleSelectKeyword(nextK);
      }
    });

    loadKeywords();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
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

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    const updated = await KeywordsService.addKeyword(newKeyword);
    setKeywords(updated);
    setNewKeyword('');
  };

  const handleSelectKeyword = async (k: string) => {
    const { url, inline } = await KeywordsService.setActiveKeyword(k);
    setActiveKeyword(k);
    setShowKeywordMenu(false);

    // Solo navegar si NO pudimos hacerlo de forma inline (sin refrescar)
    if (!inline) {
      window.location.href = url;
    }
  };

  const handleRemoveKeyword = async (e: React.MouseEvent, k: string) => {
    e.stopPropagation();
    const updated = await KeywordsService.removeKeyword(k);
    setKeywords(updated);
  };

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
          <div onMouseDown={handleMouseDown} className="dreamlive-modal-header" style={{ padding: '16px 18px', cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--apple-text-main)', letterSpacing: '-0.3px' }}>
                  Recopilar Leads
                </span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: isRunning ? 'var(--color-blue)' : 'var(--apple-text-sub)', textTransform: 'uppercase' }}>
                  {isRunning ? 'En ejecución' : 'Presiona aquí para agregar o cambiar palabras.'}
                </span>
              </div>

              {/* Keyword Selector Pill */}
              <button
                onClick={() => setShowKeywordMenu(!showKeywordMenu)}
                title="Cambiar nicho de búsqueda"
                style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '20px', background: 'var(--apple-bg-secondary)',
                  border: '1px solid var(--apple-border)', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: showKeywordMenu ? '0 0 10px rgba(0, 122, 255, 0.2)' : 'none'
                }}
              >
                <Hash size={10} color="var(--color-blue)" />
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--apple-text-main)' }}>{activeKeyword}</span>
                <Plus size={10} style={{ opacity: 0.5, transform: showKeywordMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isRunning ? 'var(--color-green)' : 'var(--apple-border)', marginLeft: '2px' }} />
              </button>
            </div>

            <div className="dreamlive-header-actions" style={{ gap: '8px' }}>
              <button onClick={() => setShowConsole(!showConsole)} className="dreamlive-icon-btn" style={{ background: showConsole ? 'var(--color-blue)' : 'var(--apple-btn-secondary)', color: showConsole ? '#FFF' : 'var(--apple-text-main)' }}><Terminal size={14} /></button>
              <button onClick={onClose} className="dreamlive-icon-btn"><X size={16} /></button>
            </div>
          </div>

          {/* Quick Keyword Menu (Apple Style) */}
          {showKeywordMenu && (
            <div style={{ padding: '0 18px 12px 18px', borderBottom: '1px solid var(--apple-border)', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ background: 'var(--apple-bg-secondary)', borderRadius: '14px', border: '1px solid var(--apple-border)', padding: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--apple-text-sub)', textTransform: 'uppercase' }}>Palabras Clave Activas</span>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--color-blue)', background: 'var(--color-blue-light)', padding: '2px 6px', borderRadius: '4px' }}>
                    Haz clic para alternar
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  {keywords.map(k => {
                    const isActive = activeKeyword === k;
                    return (
                      <div
                        key={k} 
                        onClick={() => handleSelectKeyword(k)}
                        style={{
                          padding: '6px 12px', borderRadius: '12px', 
                          background: isActive ? 'var(--color-blue)' : 'var(--apple-bg)',
                          border: `1.5px solid ${isActive ? 'var(--color-blue)' : 'var(--apple-border)'}`, 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isActive ? '0 2px 8px rgba(0, 122, 255, 0.3)' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#FFF' : 'var(--apple-border)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: isActive ? '#FFF' : 'var(--apple-text-main)' }}>{k}</span>
                        <button 
                          onClick={(e) => handleRemoveKeyword(e, k)} 
                          style={{ 
                            background: 'none', border: 'none', padding: '2px', marginLeft: '2px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isActive ? '#FFF' : 'var(--apple-text-sub)',
                            opacity: 0.7
                          }}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text" placeholder="Añadir nicho..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--apple-border)', background: 'var(--apple-bg)', fontSize: '11px', color: 'var(--apple-text-main)', outline: 'none' }}
                  />
                  <button onClick={handleAddKeyword} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-blue)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Body */}
          <div className="dreamlive-modal-body" style={{ padding: '20px 18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '90px', height: '90px', borderRadius: '50%', border: `5px solid ${isRunning ? 'var(--color-blue)' : 'var(--apple-btn-secondary)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', 
                  boxShadow: isRunning ? '0 0 20px rgba(0, 122, 255, 0.3)' : 'none',
                  position: 'relative',
                  background: 'var(--apple-bg)'
                }}
              >
                <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--apple-text-main)', lineHeight: '1.2' }}>{count}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--apple-text-sub)' }}>SESIÓN</span>
                
                {/* Tooltip flotante */}
                {!isRunning && count === 0 && (
                   <div style={{
                     position: 'absolute', bottom: '-28px', whiteSpace: 'nowrap',
                     background: '#007AFF', color: '#fff', padding: '4px 10px',
                     borderRadius: '8px', fontSize: '10px', fontWeight: '700', 
                     boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
                     animation: 'bounce 2s infinite',
                     zIndex: 10
                   }}>
                     Presiona Iniciar para comenzar
                     <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: '#007AFF' }} />
                   </div>
                )}
              </div>
              
              <div style={{ marginTop: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--apple-text-sub)' }}>
                  Total en base de datos
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-blue)' }} />
                   <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--apple-text-main)' }}>{globalTotal} leads</span>
                </div>
              </div>
            </div>

            <div className="dreamlive-button-group" style={{ gap: '10px' }}>
              <button
                onClick={async () => {
                  if (isRunning) {
                    tiktokScraper.stop();
                  } else {
                    // Verificar si estamos en la ruta correcta antes de iniciar
                    const currentUrl = window.location.href;
                    const expectedPart = `q=${encodeURIComponent(activeKeyword)}`;

                    if (!currentUrl.includes(expectedPart) || !currentUrl.includes('/search')) {
                      tiktokScraper.log(`Navegando a la búsqueda de "${activeKeyword}"...`);
                      const { url, inline } = await KeywordsService.setActiveKeyword(activeKeyword);
                      if (!inline) window.location.href = url;
                      // Esperar un poco a que cargue si fue inline
                      if (inline) await new Promise(r => setTimeout(r, 2000));
                    }

                    const licenseId = await KeywordsService.getLicenseId();
                    if (licenseId) tiktokScraper.setLicenseId(licenseId);

                    tiktokScraper.start();
                  }
                }}
                className="dreamlive-btn" style={{ background: isRunning ? '#FF3B30' : 'var(--color-blue)', color: '#FFFFFF', height: '42px' }}
              >
                {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span>{isRunning ? 'Detener Servicio' : 'Iniciar Extracción'}</span>
              </button>

              <button onClick={handleOpenHistory} className="dreamlive-btn" style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '42px' }}>
                <UserPlus size={16} />
                <span>Ver Leads</span>
              </button>
            </div>
          </div>

          {/* Console */}
          {showConsole && (
            <div style={{ borderTop: '1px solid var(--apple-border)', background: '#000', padding: '12px', maxHeight: '100px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ fontSize: '10px', color: '#A1A1A6', fontFamily: 'monospace' }}>{log}</div>
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
