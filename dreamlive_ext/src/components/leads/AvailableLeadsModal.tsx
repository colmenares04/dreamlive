import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Lead {
  id: string;
  username: string;
  viewer_count: number;
  likes_count?: number; // Nuevo
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

    // Get total count on first load
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

  // ✅ BORRADO MASIVO
  const handleDeleteAll = async () => {
    if (
      !confirm(
        "¿Estás seguro de BORRAR TODOS los disponibles? Esta acción no se puede deshacer.",
      )
    )
      return;

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

  // ✅ FUNCIÓN PARA BORRAR
  const handleDelete = async (id: string, username: string) => {
    // 1. Actualización Optimista (UI instantánea)
    const previousLeads = [...leads];
    setLeads((prev) => prev.filter((lead) => lead.id !== id));

    toast.promise(
      async () => {
        const { error } = await supabase
          .from("tiktok_leads")
          .delete()
          .eq("id", id);

        if (error) throw error;
        if (error) throw error;
        onLeadDeleted?.();
      },
      {
        loading: "Eliminando...",
        success: `Usuario @${username} eliminado.`,
        error: (err) => {
          // Si falla, revertimos el cambio en la UI
          setLeads(previousLeads);
          return "Error al eliminar usuario.";
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">
            Usuarios Disponibles
          </h2>
          <div className="flex items-center gap-3">
            {leads.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                title="Eliminar todos los disponibles"
              >
                BORRAR TODOS
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-gray-800  text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-400">
                Cargando disponibles...
              </span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No hay usuarios disponibles aún.
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="group flex flex-row items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all duration-200 gap-3"
                >
                  {/* IZQUIERDA: Info Usuario */}
                  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div
                      className="font-bold text-gray-800 text-[14px] leading-tight truncate flex items-center gap-1.5"
                      title={lead.username}
                    >
                      @{lead.username}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center font-medium mt-1 truncate">
                      {lead.likes_count && lead.likes_count > 0 ? (
                        <>
                          <span className="shrink-0 w-1.5 h-1.5 bg-rose-500 rounded-full mr-1.5"></span>
                          <span className="truncate text-rose-600">
                            {lead.likes_count.toLocaleString()} Likes
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="shrink-0 w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                          <span className="truncate text-green-600">
                            {lead.viewer_count.toLocaleString()} Viewers
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* DERECHA: Botones de Acción */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Botón Borrar */}
                    <button
                      onClick={() => handleDelete(lead.id, lead.username)}
                      className="h-15 w-15 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                      title="Eliminar de la lista"
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

                    {/* Botón Perfil */}
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-xs font-medium border-gray-600 bg-gray-50 hover:bg-white hover:text-blue-600 transition-colors"
                      onClick={() => {
                        const url = `https://www.tiktok.com/@${lead.username}`;
                        browser.tabs.create({ url });
                      }}
                    >
                      Perfil ↗
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with integrated Load More */}
        <div className="p-3 border-t bg-gray-50 flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
            {loading
              ? "CARGANDO..."
              : totalCount > 0
                ? `MOSTRANDO ${leads.length} DE ${totalCount}`
                : `${leads.length} DISPONIBLES`}
          </span>

          {!loading && hasMore && leads.length > 0 && (
            <button
              onClick={() => fetchAvailableLeads(false)}
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
