import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";
import { browser } from "wxt/browser";
import { toast } from "sonner";

interface Lead {
  id: string;
  username: string;
  viewer_count: number;
  likes_count?: number; // Nuevo
  status: string;
  captured_at: string;
}

export const LeadsListModal = ({
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
      loadLeads(true);
    } else {
      // Reset state when modal closes
      setLeads([]);
      setHasMore(true);
      setTotalCount(0);
    }
  }, [isOpen]);

  const loadLeads = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setLeads([]);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    // 1. OBTENER LA LICENCIA ACTIVA
    const license = await licenseService.getStoredLicense();

    if (!license?.id) {
      console.error("Sin licencia activa");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const currentLength = reset ? 0 : leads.length;
    const BATCH_SIZE = 100;

    // 2. Get total count (only on first load)
    if (reset) {
      const { count } = await supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", license.id)
        .eq("status", "recopilado");
      setTotalCount(count || 0);
    }

    // 3. FILTRAR POR license_id Y status 'recopilado' con paginación
    const { data } = await supabase
      .from("tiktok_leads")
      .select("*")
      .eq("license_id", license.id)
      .eq("status", "recopilado")
      .order("captured_at", { ascending: false })
      .range(currentLength, currentLength + BATCH_SIZE - 1);

    const newLeads = data || [];

    if (reset) {
      setLeads(newLeads);
    } else {
      setLeads((prev) => [...prev, ...newLeads]);
    }

    // Check if there are more items to load
    setHasMore(newLeads.length === BATCH_SIZE);

    setLoading(false);
    setLoadingMore(false);
  };

  // Listen for messages to refresh the list
  useEffect(() => {
    const messageListener = (message: any) => {
      if (
        message.type === "ROTATE_KEYWORD" ||
        message.type === "SCROLL_COMPLETED" ||
        message.type === "BATCH_PROCESSED"
      ) {
        // Refresh the list when keyword rotates or scroll completes
        if (isOpen) {
          loadLeads(true);
        }
      }

      // Instant update on each scroll batch for faster feedback
      if (message.type === "SCROLL_BATCH_COMPLETED" && isOpen) {
        loadLeads(true);
      }

      // Real-time update during collection - batch every 5 leads
      if (message.type === "LEAD_SAVED_CONFIRMATION" && isOpen) {
        // Use a debounced approach to batch updates
        if (!(window as any)._pendingListUpdateTimeout) {
          (window as any)._pendingListUpdateTimeout = setTimeout(() => {
            loadLeads(true);
            (window as any)._pendingListUpdateTimeout = null;
          }, 2000); // Refresh every 2 seconds during active collection
        }
      }
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
      if ((window as any)._pendingListUpdateTimeout) {
        clearTimeout((window as any)._pendingListUpdateTimeout);
        (window as any)._pendingListUpdateTimeout = null;
      }
    };
  }, [isOpen]);

  // ✅ BORRADO MASIVO
  const handleDeleteAll = async () => {
    if (
      !confirm(
        "¿Estás seguro de BORRAR TODOS los pendientes? Esta acción no se puede deshacer.",
      )
    )
      return;

    setLoading(true);
    const license = await licenseService.getStoredLicense();
    if (!license?.id) return;

    const { error } = await supabase
      .from("tiktok_leads")
      .delete()
      .eq("license_id", license.id)
      .eq("status", "recopilado");

    if (error) {
      toast.error("Error eliminando todos los leads.");
      setLoading(false);
    } else {
      toast.success("Todos los leads han sido eliminados.");
      setLeads([]);
      setLoading(false);
      onLeadDeleted?.();
    }
  };

  // ✅ FUNCIÓN DE ELIMINAR (Idéntica a AvailableLeadsModal)
  const handleDelete = async (id: string, username: string) => {
    const previousLeads = [...leads];
    // Actualización optimista
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
          setLeads(previousLeads); // Revertir si falla
          return "Error al eliminar.";
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Pendientes de Verificar
          </h2>
          <div className="flex items-center gap-3">
            {leads.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                BORRAR TODOS
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3 opacity-60">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500 font-medium">
                Cargando pendientes...
              </span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm italic">
              No hay usuarios pendientes de verificar.
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="group flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
              >
                {/* IZQUIERDA */}
                <div className="flex-1 min-w-0 pr-3">
                  <div
                    className="font-bold text-gray-800 text-[13px] truncate flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors"
                    title={lead.username}
                    onClick={() => {
                      const url = `https://www.tiktok.com/@${lead.username}`;
                      browser.tabs.create({ url });
                    }}
                  >
                    @{lead.username}
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center font-medium mt-0.5 truncate gap-2">
                    {lead.likes_count && lead.likes_count > 0 ? (
                      <div
                        className="flex items-center text-rose-500"
                        title="Likes"
                      >
                        <span className="mr-1">❤️</span>
                        {lead.likes_count.toLocaleString()}
                      </div>
                    ) : (
                      <div
                        className="flex items-center text-orange-500"
                        title="Viewers"
                      >
                        <span className="mr-1">👁️</span>
                        {lead.viewer_count?.toLocaleString() || 0}
                      </div>
                    )}
                    <span className="text-gray-300">•</span>
                    <span>
                      {new Date(lead.captured_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* DERECHA: Acciones */}
                <div className="flex items-center gap-1">
                  {/* Botón Borrar */}
                  <button
                    onClick={() => handleDelete(lead.id, lead.username)}
                    className="h-15 w-15 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent"
                    title="Eliminar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </button>

                  {/* Botón Ver Perfil */}
                  <button
                    className="h-7 px-2.5 flex items-center justify-center rounded-md text-[10px] font-semibold text-gray-600 bg-gray-200 border-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors border border-transparent"
                    onClick={() => {
                      const url = `https://www.tiktok.com/@${lead.username}`;
                      browser.tabs.create({ url });
                    }}
                  >
                    Perfil ↗
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with integrated Load More */}
        <div className="p-3 border-t bg-gray-50 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
            {loading
              ? "CARGANDO..."
              : totalCount > 0
                ? `MOSTRANDO ${leads.length} DE ${totalCount}`
                : `${leads.length} PENDIENTES`}
          </span>

          {!loading && hasMore && leads.length > 0 && (
            <button
              onClick={() => loadLeads(false)}
              disabled={loadingMore}
              className="flex-shrink-0 py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loadingMore ? "#e5e7eb" : "#f9fafb",
                color: loadingMore ? "#9ca3af" : "#374151",
                border: "1px solid #e5e7eb",
                boxShadow: loadingMore
                  ? "none"
                  : "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                if (!loadingMore) {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0, 0, 0, 0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loadingMore) {
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow =
                    "0 1px 2px rgba(0, 0, 0, 0.05)";
                }
              }}
            >
              {loadingMore ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  <span>Cargando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>Cargar Más</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
