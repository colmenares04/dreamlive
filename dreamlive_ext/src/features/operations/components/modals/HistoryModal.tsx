import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, History, User, Clock, ExternalLink, Users, Heart, AlertCircle, RefreshCw, Search, Hash } from 'lucide-react';
import { browser } from 'wxt/browser';
import { LeadsService } from '../../services/leads.service';

interface LeadData {
  id: string;
  username: string;
  created_at: string;
  viewer_count: number;
  likes_count: number;
  status: string;
}

interface Props {
  onClose: () => void;
  isDarkMode?: boolean;
  activeModal?: 'HISTORY_RECOPILAR' | 'HISTORY_DISPONIBILIDAD' | 'HISTORY_CONTACTAR' | null;
}

type FilterType = 'viewers' | 'likes' | 'all';

export const HistoryModal: React.FC<Props> = ({ onClose, activeModal }) => {
  const [position, setPosition] = useState({ x: 320, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [minQuantity, setMinQuantity] = useState<number | ''>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let status = 'recopilado';
      if (activeModal === 'HISTORY_DISPONIBILIDAD') {
        status = 'disponible';
      } else if (activeModal === 'HISTORY_CONTACTAR') {
        status = 'contactado';
      }
      const data = await LeadsService.getLeads(status, 1, 100);
      if (data && data.items) {
        setLeads(data.items);
      }
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('401')) {
        setError('Sesión expirada. Por favor, reinicia sesión.');
      } else {
        setError('Error de conexión con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    browser.storage.local.get('history_position').then((res) => {
      const pos = res.history_position as { x: number; y: number } | undefined;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        setPosition(pos);
      }
    });
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeFilter === 'all' ? true : activeFilter === 'viewers' ? (lead.viewer_count || 0) > 0 : (lead.likes_count || 0) > 0;
      let matchesQuantity = true;
      if (typeof minQuantity === 'number') {
        if (activeFilter === 'viewers') matchesQuantity = (lead.viewer_count || 0) >= minQuantity;
        else if (activeFilter === 'likes') matchesQuantity = (lead.likes_count || 0) >= minQuantity;
        else matchesQuantity = Math.max(lead.viewer_count || 0, lead.likes_count || 0) >= minQuantity;
      }
      return matchesSearch && matchesType && matchesQuantity;
    });
  }, [leads, searchQuery, activeFilter, minQuantity]);

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
        browser.storage.local.set({ history_position: position });
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'reciente';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'reciente';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'ahora';
      if (diffMin < 60) return `hace ${diffMin}m`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `hace ${diffHrs}h`;
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch (e) { return 'reciente'; }
  };

  const openTikTokProfile = (username: string) => {
    const clean = username.replace('@', '');
    window.open(`https://www.tiktok.com/@${clean}`, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed', zIndex: 2147483645,
        top: `${position.y}px`, left: `${position.x}px`,
        pointerEvents: 'auto', width: '420px'
      }}
    >
      <div className="dreamlive-modal-container">
        <div className="dreamlive-modal-card">
          {/* Header */}
          <div onMouseDown={handleMouseDown} className="dreamlive-modal-header" style={{ padding: '16px 18px', cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--apple-text-main)', letterSpacing: '-0.3px' }}>
                {activeModal === 'HISTORY_DISPONIBILIDAD' ? 'Historial Disponibles' : activeModal === 'HISTORY_CONTACTAR' ? 'Historial Contactados' : 'Explorador de Leads'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-blue)', marginTop: '1px' }}>
                FILTRADO INTELIGENTE
              </span>
            </div>
            <div className="dreamlive-header-actions" style={{ gap: '8px' }}>
              <button onClick={fetchLeads} className="dreamlive-icon-btn" title="Refrescar"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
              <button onClick={onClose} className="dreamlive-icon-btn"><X size={16} /></button>
            </div>
          </div>

          {/* Search Area */}
          <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 2, display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--apple-text-sub)' }} />
                <input 
                  type="text" placeholder="Usuario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px 8px 32px', borderRadius: '10px',
                    background: 'var(--apple-btn-secondary)', border: 'none',
                    fontSize: '12px', fontWeight: '500', color: 'var(--apple-text-main)', outline: 'none'
                  }}
                />
              </div>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <Hash size={14} style={{ position: 'absolute', left: '10px', color: 'var(--apple-text-sub)' }} />
                <input 
                  type="number" placeholder="Min."
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{
                    width: '100%', padding: '8px 10px 8px 30px', borderRadius: '10px',
                    background: 'var(--apple-btn-secondary)', border: 'none',
                    fontSize: '12px', fontWeight: '500', color: 'var(--apple-text-main)', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['viewers', 'likes', 'all'] as FilterType[]).map((f) => (
                <button
                  key={f} onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                    textTransform: 'uppercase', transition: 'all 0.2s',
                    background: activeFilter === f ? 'var(--color-blue)' : 'var(--apple-btn-secondary)',
                    color: activeFilter === f ? '#FFFFFF' : 'var(--apple-text-sub)', border: 'none', cursor: 'pointer'
                  }}
                >
                  {f === 'viewers' ? 'Espectadores' : f === 'likes' ? 'Likes' : 'Todos'}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="dreamlive-modal-body" style={{ padding: '0 12px 20px 12px' }}>
            {isLoading && leads.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--color-blue)', borderTopColor: 'transparent', borderRadius: '50%' }} />
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#FF3B30' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                <p style={{ fontSize: '12px', fontWeight: '700' }}>{error}</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5 }}>
                <Search size={32} style={{ margin: '0 auto 12px', color: 'var(--apple-text-sub)' }} />
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--apple-text-sub)' }}>Sin resultados encontrados</p>
              </div>
            ) : (
              <div className="dreamlive-history-list" style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredLeads.map((lead) => {
                  const hasViewers = (lead.viewer_count || 0) > 0;
                  const value = hasViewers ? lead.viewer_count : (lead.likes_count || 0);
                  return (
                    <div key={lead.id} className="dreamlive-history-item" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '14px', background: 'var(--apple-bg-secondary)',
                      marginBottom: '8px', border: '1px solid var(--apple-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--apple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--apple-border)' }}>
                          <User size={16} color="var(--color-blue)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--apple-text-main)' }}>@{lead.username.replace('@', '')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--apple-text-sub)' }}>
                              <Clock size={11} />
                              <span style={{ fontSize: '10px', fontWeight: '600' }}>{formatDate(lead.created_at)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasViewers ? 'var(--color-blue)' : '#FF2D55' }}>
                              {hasViewers ? <Users size={11} /> : <Heart size={11} fill="currentColor" />}
                              <span style={{ fontSize: '11px', fontWeight: '800' }}>{value.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => openTikTokProfile(lead.username)} className="dreamlive-icon-btn" style={{ width: '30px', height: '30px', background: 'var(--apple-bg)' }}><ExternalLink size={14} color="var(--apple-text-main)" /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--apple-text-sub)', opacity: 0.6, textTransform: 'uppercase' }}>
                {filteredLeads.length} leads coinciden
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
