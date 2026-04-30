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
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Cargando...</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-50">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
          <Inbox size={32} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Lista Vacía</p>
          <p className="text-xs font-medium text-slate-500 mt-1">No hay leads en estado {status}.</p>
        </div>
      </div>
    );
  }

  const hasMore = leads.length < totalCount;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Search and Stats */}
      <div className="space-y-3 mb-4">
        <div className="relative group">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder="Buscar por usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg py-2 pl-9 pr-8 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-[#161b22] px-2 py-0.5 rounded">
              TOTAL: {totalCount}
            </span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            className="text-[10px] h-7 px-3 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/20 font-black tracking-widest uppercase"
          >
            <Trash2 size={12} className="mr-1.5" />
            Limpiar Todo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {leads.map((lead) => {
          const isLikes = lead.likes_count > 0;
          return (
            <div
              key={lead.id}
              className="group flex items-center justify-between p-3.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm
                  ${isLikes ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"}`}>
                  {isLikes ? <Heart size={16} /> : <Eye size={16} />}
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-sm font-bold text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => browser.tabs.create({ url: `https://www.tiktok.com/@${lead.username}` })}
                  >
                    @{lead.username}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter
                      ${isLikes ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"}`}>
                      {isLikes ? `${lead.likes_count.toLocaleString()} Likes` : `${lead.viewer_count.toLocaleString()} Viewers`}
                    </span>
                    {lead.created_at && (
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(lead.id, lead.username)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
                <Button
                  variant="primary"
                  className="h-8 px-3 rounded-lg text-[10px]"
                  onClick={() => browser.tabs.create({ url: `https://www.tiktok.com/@${lead.username}` })}
                >
                  <ExternalLink size={12} className="mr-1" /> Perfil
                </Button>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <div className="pt-4 pb-2 flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchLeads(page + 1, false, debouncedSearch)}
              isLoading={loadingMore}
              className="rounded-full px-6 text-xs font-bold"
            >
              Cargar Más
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
