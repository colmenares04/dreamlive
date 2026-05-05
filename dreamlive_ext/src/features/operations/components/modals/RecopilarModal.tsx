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
    browser.runtime.sendMessage({ type: 'REFRESH_METRICS' }).catch(() => { });

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
    tiktokScraper.stop();
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
          <div onMouseDown={handleMouseDown} className="dreamlive-modal-header" style={{ padding: '12px 14px', cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="dreamlive-title-main">Recopilar Leads</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: isRunning ? 'var(--color-primary)' : 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {isRunning ? 'MOTOR ACTIVO' : 'SISTEMA LISTO'}
                </span>
              </div>

              {/* Keyword Selector Pill */}
              <button
                onClick={() => setShowKeywordMenu(!showKeywordMenu)}
                title="Cambiar nicho de búsqueda"
                style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '20px', background: 'var(--apple-bg-secondary)',
                  border: '1px solid var(--apple-border)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: showKeywordMenu ? '0 0 12px rgba(20, 115, 116, 0.15)' : 'none'
                }}
              >
                <Hash size={11} color="var(--color-primary)" />
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--apple-text-main)' }}>
                  {activeKeyword.split(/[,\/]/)[0]}
                </span>
                <Plus size={11} style={{ opacity: 0.6, transform: showKeywordMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isRunning ? 'var(--color-primary)' : 'var(--apple-border)', marginLeft: '2px', boxShadow: isRunning ? '0 0 8px var(--color-primary)' : 'none' }} />
              </button>
            </div>
            <div className="dreamlive-header-actions" style={{ gap: '8px' }}>
              <button
                onClick={() => setShowConsole(!showConsole)}
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

          {/* Quick Keyword Menu (Apple Style) */}
          {showKeywordMenu && (
            <div style={{ padding: '0 18px 12px 18px', borderBottom: '1px solid var(--apple-border)', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: 'var(--apple-bg-secondary)', borderRadius: '16px', border: '1px solid var(--apple-border)', padding: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--apple-text-sub)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Palabras Clave Activas</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  {keywords.map(k => {
                    const isActive = activeKeyword === k;
                    return (
                      <div
                        key={k}
                        onClick={() => handleSelectKeyword(k)}
                        style={{
                          padding: '7px 14px', borderRadius: '14px',
                          background: isActive ? 'var(--color-primary-gradient)' : 'var(--apple-bg)',
                          border: `1px solid ${isActive ? 'transparent' : 'var(--apple-border)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isActive ? '0 4px 12px rgba(20, 115, 116, 0.25)' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#FFF' : 'var(--apple-border)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '800', color: isActive ? '#FFF' : 'var(--apple-text-main)' }}>{k}</span>
                        <button
                          onClick={(e) => handleRemoveKeyword(e, k)}
                          style={{
                            background: 'none', border: 'none', padding: '2px', marginLeft: '2px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isActive ? '#FFF' : 'var(--apple-text-sub)',
                            opacity: 0.8
                          }}
                        >
                          <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text" placeholder="Añadir nicho..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--apple-border)', background: 'var(--apple-bg)', fontSize: '12px', color: 'var(--apple-text-main)', outline: 'none', transition: 'border-color 0.3s' }}
                  />
                  <button onClick={handleAddKeyword} style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--color-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: '0 4px 10px rgba(20, 115, 116, 0.2)' }}>
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Body */}
          <div className="dreamlive-modal-body" style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${isRunning ? 'var(--color-primary)' : 'var(--apple-btn-secondary)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isRunning ? '0 0 20px rgba(20, 115, 116, 0.3)' : 'none',
                  position: 'relative',
                  background: 'var(--apple-bg)'
                }}
              >
                <span style={{ fontSize: '24px', fontVariantNumeric: 'tabular-nums', fontWeight: '900', color: 'var(--apple-text-main)', lineHeight: '1.1' }}>{count}</span>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--apple-text-sub)', letterSpacing: '0.5px' }}>SESIÓN</span>

                {!isRunning && count === 0 && (
                  <div style={{
                    position: 'absolute', bottom: '-32px', whiteSpace: 'nowrap',
                    background: 'var(--color-primary-gradient)', color: '#fff', padding: '5px 12px',
                    borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                    boxShadow: '0 4px 12px rgba(20, 115, 116, 0.3)',
                    animation: 'bounce 2s infinite',
                    zIndex: 10
                  }}>
                    Presiona Iniciar para comenzar
                    <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'var(--color-primary)' }} />
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--apple-text-sub)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Total Recopilado
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--apple-bg-secondary)', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--apple-border)' }}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#34C759] animate-pulse' : 'bg-gray-400'}`} />
                  <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', fontWeight: '900', color: 'var(--apple-text-main)' }}>{globalTotal} leads</span>
                </div>
              </div>
            </div>

            <div className="dreamlive-button-group" style={{ gap: '12px' }}>
              <button
                onClick={async () => {
                  if (isRunning) {
                    tiktokScraper.stop();
                  } else {
                    const cleanKeyword = activeKeyword.split(/[,\/]/)[0].trim();
                    const currentUrl = window.location.href;
                    const expectedPart = `q=${encodeURIComponent(cleanKeyword)}`;

                    if (!currentUrl.includes(expectedPart) || !currentUrl.includes('/search')) {
                      tiktokScraper.log(`Navegando a la búsqueda de "${cleanKeyword}"...`);
                      const { url, inline } = await KeywordsService.setActiveKeyword(cleanKeyword);
                      if (!inline) window.location.href = url;
                      if (inline) await new Promise(r => setTimeout(r, 2000));
                    }

                    const licenseId = await KeywordsService.getLicenseId();
                    if (licenseId) tiktokScraper.setLicenseId(licenseId);

                    tiktokScraper.start();
                  }
                }}
                className="dreamlive-btn"
                style={{
                  background: isRunning ? '#FF3B30' : 'var(--color-primary-gradient)',
                  color: '#FFFFFF',
                  height: '40px',
                  boxShadow: isRunning ? '0 4px 15px rgba(255, 59, 48, 0.2)' : '0 4px 15px rgba(20, 115, 116, 0.25)'
                }}
              >
                {isRunning ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                <span style={{ fontWeight: '800' }}>{isRunning ? 'Detener Servicio' : 'Iniciar Extracción'}</span>
              </button>

              <button
                onClick={handleOpenHistory}
                className="dreamlive-btn"
                style={{ background: 'var(--apple-btn-secondary)', color: 'var(--apple-text-main)', height: '40px', border: '1px solid var(--apple-border)' }}
              >
                <ArrowRight size={18} strokeWidth={2.5} />
                <span style={{ fontWeight: '800' }}>Ver Leads</span>
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
