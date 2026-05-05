import React, { useState, useEffect } from 'react';
import { LeadsService } from '../services/leads.service';
import { Loader2, Trash2, ExternalLink, Inbox, Heart, Eye, Search as SearchIcon, X } from 'lucide-react';
import { Badge, Button } from '../../../shared/components/ui';
import { browser } from 'wxt/browser';

interface Lead {
  id: string;
  username: string;
  viewer_count: number;
  likes_count: number;
  status: string;
  created_at?: string;
}

interface LeadsTableProps {
  status: 'recopilado' | 'disponible' | 'contactado';
}

export const LeadsTable: React.FC<LeadsTableProps> = ({ status }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = async (pageNumber: number, isReset: boolean = false, searchTerm: string = '') => {
    try {
      if (isReset) setLoading(true);
      else setLoadingMore(true);

      const response = await LeadsService.getLeads(status, pageNumber, 50, searchTerm);
      
      if (isReset) {
        setLeads(response.items || []);
      } else {
        setLeads((prev) => [...prev, ...(response.items || [])]);
      }
      setTotalCount(response.total || 0);
      setPage(pageNumber);
    } catch (error) {
      alert('Error cargando la lista de leads');
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeads(1, true, debouncedSearch);
    
    // Escuchar mensajes del background por si la extensión actualiza algo
    const listener = (msg: any) => {
      if (msg.type === 'LEAD_SAVED_CONFIRMATION' && status === 'recopilado') {
        if (msg.payload && !debouncedSearch) {
          setLeads((prev) => {
            if (prev.some(l => l.id === msg.payload.id)) return prev;
            return [msg.payload, ...prev];
          });
          setTotalCount((prev) => prev + 1);
        } else {
          fetchLeads(1, true, debouncedSearch);
        }
      }
      if (msg.type === 'BATCH_PROCESSED' && (status === 'disponible' || status === 'recopilado')) {
        fetchLeads(1, true, debouncedSearch);
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [status, debouncedSearch]);

  const handleDelete = async (id: string, username: string) => {
    const previous = [...leads];
    setLeads(leads.filter(l => l.id !== id));
    setTotalCount(prev => prev - 1);
    
    try {
      await LeadsService.deleteLead(id);
    } catch (error) {
      setLeads(previous);
      setTotalCount(prev => prev + 1);
      alert('Error al eliminar el lead.');
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`¿Estás seguro de borrar TODOS los leads en estado "${status}"? Esta acción no se puede deshacer.`)) return;
    
    setLoading(true);
    try {
      await LeadsService.clearLeads(status);
      setLeads([]);
      setTotalCount(0);
    } catch (error) {
      alert('Error limpiando la lista');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[var(--color-apple-green)] animate-spin" strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Cargando...</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-50">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Inbox size={32} strokeWidth={1.5} className="text-gray-400" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Lista Vacía</p>
          <p className="text-[13px] text-gray-500 mt-1">No hay leads en estado {status}.</p>
        </div>
      </div>
    );
  }

  const hasMore = leads.length < totalCount;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Search and Stats */}
      <div className="space-y-4 mb-4">
        <div className="relative group">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--color-apple-green)] transition-colors" size={16} strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar por usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-transparent rounded-[10px] py-2.5 pl-10 pr-8 text-[13px] text-gray-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[var(--color-apple-green)]/50 focus:ring-4 focus:ring-[var(--color-apple-green)]/10 transition-all placeholder:text-gray-400"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
              Total: {totalCount}
            </span>
          </div>
          <button 
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            <Trash2 size={12} strokeWidth={1.5} />
            Limpiar Todo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar pb-4">
        {leads.map((lead) => {
          const isLikes = lead.likes_count > 0;
          return (
              <div
              key={lead.id}
              className="group flex items-center justify-between p-3.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[14px] hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center
                  ${isLikes ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500" : "bg-[var(--color-apple-green)]/10 text-[var(--color-apple-green)]"}`}>
                  {isLikes ? <Heart size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-[14px] font-semibold text-gray-900 dark:text-white tracking-tight cursor-pointer hover:underline decoration-[var(--color-apple-green)] underline-offset-2 transition-all"
                    onClick={() => browser.tabs.create({ url: `https://www.tiktok.com/@${lead.username}` })}
                  >
                    @{lead.username}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] font-medium
                      ${isLikes ? "text-rose-600 dark:text-rose-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {isLikes ? `${lead.likes_count.toLocaleString()} Likes` : `${lead.viewer_count.toLocaleString()} Viewers`}
                    </span>
                    {lead.created_at && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => browser.tabs.create({ url: `https://www.tiktok.com/@${lead.username}` })}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-[var(--color-apple-green)] hover:bg-[var(--color-apple-green)]/10 transition-colors"
                  title="Abrir Perfil"
                >
                  <ExternalLink size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleDelete(lead.id, lead.username)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <div className="pt-2 pb-2 flex justify-center">
            <button
              onClick={() => fetchLeads(page + 1, false, debouncedSearch)}
              disabled={loadingMore}
              className="px-6 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[12px] font-medium transition-colors"
            >
              {loadingMore ? 'Cargando...' : 'Cargar Más'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
