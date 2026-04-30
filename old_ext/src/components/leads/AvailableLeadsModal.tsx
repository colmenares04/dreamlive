import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Lead {
  id: string;
  username: string;
  viewer_count: number;
  likes_count?: number;
  status: string;
}

export const AvailableLeadsModal = ({
  isOpen,
  onClose,
  onLeadDeleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLeadDeleted?: () => void;
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableLeads(true);
    } else {
      setLeads([]);
      setHasMore(true);
      setTotalCount(0);
    }
  }, [isOpen]);

  const fetchAvailableLeads = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setLeads([]);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const storage = await browser.storage.local.get("savedLicense");
    const licenseId = (storage.savedLicense as any)?.id;

    if (!licenseId) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const currentLength = reset ? 0 : leads.length;
    const BATCH_SIZE = 100;

    if (reset) {
      const { count } = await supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", licenseId)
        .eq("status", "disponible");
      setTotalCount(count || 0);
    }

    const { data } = await supabase
      .from("tiktok_leads")
      .select("id, username, viewer_count, likes_count, status")
      .eq("license_id", licenseId)
      .eq("status", "disponible")
      .order("viewer_count", { ascending: false })
      .range(currentLength, currentLength + BATCH_SIZE - 1);

    const newLeads = data || [];

    if (reset) {
      setLeads(newLeads);
    } else {
      setLeads((prev) => [...prev, ...newLeads]);
    }

    setHasMore(newLeads.length === BATCH_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Estás seguro de BORRAR TODOS los disponibles? Esta acción no se puede deshacer.")) return;

    setLoading(true);
    const storage = await browser.storage.local.get("savedLicense");
    const licenseId = (storage.savedLicense as any)?.id;

    if (!licenseId) return;

    const { error } = await supabase
      .from("tiktok_leads")
      .delete()
      .eq("license_id", licenseId)
      .eq("status", "disponible");

    if (error) {
      toast.error("Error eliminando disponibles.");
      setLoading(false);
    } else {
      toast.success("Todos los disponibles han sido eliminados.");
      setLeads([]);
      setLoading(false);
      onLeadDeleted?.();
    }
  };

  const handleDelete = async (id: string, username: string) => {
    const previousLeads = [...leads];
    setLeads((prev) => prev.filter((lead) => lead.id !== id));

    toast.promise(
      async () => {
        const { error } = await supabase
          .from("tiktok_leads")
          .delete()
          .eq("id", id);
        if (error) throw error;
        onLeadDeleted?.();
      },
      {
        loading: "Eliminando...",
        success: `Usuario @${username} eliminado.`,
        error: () => {
          setLeads(previousLeads);
          return "Error al eliminar usuario.";
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 scale-in-center animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Usuarios Disponibles</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Leads capturados listos para contactar.</p>
          </div>
          <div className="flex items-center gap-3">
            {leads.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-all uppercase tracking-widest border border-rose-100 dark:border-rose-500/20"
              >
                Limpiar Todo
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all active:scale-90"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin dark:scrollbar-thumb-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Sincronizando...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl">
                📥
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Sin Usuarios</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Captura algunos leads para empezar.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {leads.map((lead) => {
                const isLikes = lead.likes_count && lead.likes_count > 0;
                return (
                  <div
                    key={lead.id}
                    className="group flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm
                        ${isLikes ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                        {isLikes ? "❤️" : "👁️"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">@{lead.username}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter
                            ${isLikes ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                            {isLikes 
                              ? `${lead.likes_count?.toLocaleString()} Likes` 
                              : `${lead.viewer_count?.toLocaleString()} Viewers`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(lead.id, lead.username)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                        title="Eliminar Lead"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <Button
                        variant="primary"
                        className="h-9 px-4 rounded-xl shadow-lg shadow-indigo-500/20"
                        onClick={() => {
                          const url = `https://www.tiktok.com/@${lead.username}`;
                          browser.tabs.create({ url });
                        }}
                      >
                        Perfil
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {loading ? "Actualizando..." : `Mostrando ${leads.length} de ${totalCount}`}
            </span>
          </div>

          {!loading && hasMore && leads.length > 0 && (
            <Button
              variant="outline"
              onClick={() => fetchAvailableLeads(false)}
              isLoading={loadingMore}
              className="rounded-xl px-6 border-slate-200 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest"
            >
              Cargar Más
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
