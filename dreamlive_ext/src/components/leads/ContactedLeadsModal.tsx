import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";
import { Button } from "@/components/ui/Button";
import { licenseService } from "@/services/licenseService";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface ContactedLead {
  id: string;
  username: string;
  contacted_at: string;
  viewer_count: number;
  likes_count: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: "all" | "today";
}

export const ContactedLeadsModal = ({ isOpen, onClose, mode }: Props) => {
  const [leads, setLeads] = useState<ContactedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeads(true);
    } else {
      setLeads([]);
      setHasMore(true);
      setTotalCount(0);
    }
  }, [isOpen, mode]);

  const fetchLeads = async (reset = false) => {
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
      let countQuery = supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", licenseId)
        .eq("status", "contactado");

      if (mode === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        countQuery = countQuery.gte("contacted_at", today.toISOString());
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);
    }

    let query = supabase
      .from("tiktok_leads")
      .select("id, username, contacted_at, viewer_count, likes_count")
      .eq("license_id", licenseId)
      .eq("status", "contactado")
      .order("contacted_at", { ascending: false })
      .range(currentLength, currentLength + BATCH_SIZE - 1);

    if (mode === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("contacted_at", today.toISOString());
    }

    const { data } = await query;
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

  // ✅ ELIMINAR UNO
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
      },
      {
        loading: "Eliminando...",
        success: `Usuario @${username} eliminado del historial.`,
        error: () => {
          setLeads(previousLeads);
          return "Error al eliminar.";
        },
      },
    );
  };

  // ✅ BORRADO MASIVO
  const handleDeleteAll = async () => {
    const confirmMsg =
      mode === "today"
        ? "¿Estás seguro de borrar los contactados de HOY?"
        : "¿Estás seguro de borrar TODO el historial de contactados?";

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    const storage = await browser.storage.local.get("savedLicense");
    const licenseId = (storage.savedLicense as any)?.id;

    if (!licenseId) return;

    let query = supabase
      .from("tiktok_leads")
      .delete()
      .eq("license_id", licenseId)
      .eq("status", "contactado");

    if (mode === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("contacted_at", today.toISOString());
    }

    const { error } = await query;

    if (error) {
      toast.error("Error al borrar el historial.");
      setLoading(false);
    } else {
      toast.success("Historial eliminado correctamente.");
      setLeads([]);
      setLoading(false);
    }
  };

  // 📊 LÓGICA DE EXPORTACIÓN PROFESIONAL
  const handleExport = async () => {
    if (leads.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    setExporting(true);
    try {
      // 1. Obtener datos de la licencia para el encabezado
      const license = await licenseService.getStoredLicense();
      const agencyName = license?.agencyName || "Agencia Desconocida";
      const recruiterName = license?.recruiterName || "Reclutador";

      // 2. Crear el libro de trabajo
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Reporte de Actividad");

      // --- ESTILOS ---
      const headerStyle = {
        font: {
          name: "Arial",
          size: 14,
          bold: true,
          color: { argb: "FFFFFFFF" },
        },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E293B" },
        }, // Azul oscuro (Slate-800)
        alignment: { vertical: "middle", horizontal: "center" },
      } as const;

      const subHeaderStyle = {
        font: {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "FF475569" },
        },
        alignment: { vertical: "middle", horizontal: "left" },
      } as const;

      const tableHeaderStyle = {
        font: {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: "FFFFFFFF" },
        },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3B82F6" },
        }, // Azul vivo (Blue-500)
        alignment: { vertical: "middle", horizontal: "center" },
        border: { bottom: { style: "medium", color: { argb: "FFFFFFFF" } } },
      } as const;

      // 3. Construir el Encabezado Corporativo
      sheet.mergeCells("A1:E2"); // Título grande
      const titleCell = sheet.getCell("A1");
      titleCell.value = `REPORTE DE ACTIVIDAD - ${agencyName.toUpperCase()}`;
      titleCell.style = headerStyle;

      // Información extra
      sheet.mergeCells("A3:E3");
      sheet.getCell("A3").value =
        `Reclutador: ${recruiterName} | Fecha de Emisión: ${new Date().toLocaleDateString()}`;
      sheet.getCell("A3").style = subHeaderStyle;
      sheet.getRow(3).height = 20;

      // Espacio vacío
      sheet.addRow([]);

      // 4. Definir Columnas de Datos
      sheet.getRow(5).values = [
        "Usuario TikTok",
        "Espectadores",
        "Likes",
        "Fecha de Contacto",
        "Hora",
      ];

      // Aplicar estilos a la cabecera de la tabla
      ["A5", "B5", "C5", "D5", "E5"].forEach((key) => {
        sheet.getCell(key).style = tableHeaderStyle;
      });
      sheet.getRow(5).height = 25;

      // 5. Insertar Datos
      leads.forEach((lead) => {
        const dateObj = new Date(lead.contacted_at);
        const row = sheet.addRow([
          `@${lead.username}`,
          lead.viewer_count || 0,
          lead.likes_count || 0,
          dateObj.toLocaleDateString(),
          dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        ]);

        // Estilo de filas de datos (bordes finos)
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };
          cell.font = { name: "Arial", size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      });

      // 6. Ajustar ancho de columnas automáticamente
      sheet.getColumn(1).width = 25; // Usuario
      sheet.getColumn(2).width = 15; // Viewers
      sheet.getColumn(3).width = 15; // Likes
      sheet.getColumn(4).width = 20; // Fecha
      sheet.getColumn(5).width = 15; // Hora

      // 7. Generar y Descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName = `Reporte_${mode === "today" ? "Hoy" : "Total"}_${new Date().getTime()}.xlsx`;

      saveAs(blob, fileName);
      toast.success("Reporte descargado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al generar el Excel");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Dinámico */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
              {mode === "today"
                ? "📅 Actividad de Hoy"
                : "📜 Historial Completo"}
            </h2>
            <p className="text-[10px] text-gray-500">
              Usuarios contactados exitosamente
            </p>
          </div>
          <div className="flex items-center gap-3">
            {leads.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                {mode === "today" ? "BORRAR HOY" : "BORRAR TODOS"}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[11px] text-gray-400">
                Consultando base de datos...
              </span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl block mb-2">∅</span>
              <p className="text-xs text-gray-400">
                No hay registros para mostrar.
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-600">
                    @{lead.username}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {new Date(lead.contacted_at).toLocaleString([], {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-right flex items-center gap-2">
                  {lead.viewer_count > 0 && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      👁️ {lead.viewer_count.toLocaleString()}
                    </span>
                  )}
                  {lead.likes_count > 0 && (
                    <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      ❤️ {lead.likes_count.toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(lead.id, lead.username)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar del historial"
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
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with integrated Load More and Export */}
        <div className="p-3 border-t bg-gray-50 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
            {loading
              ? "CARGANDO..."
              : totalCount > 0
                ? `MOSTRANDO ${leads.length} DE ${totalCount}`
                : `${leads.length} CONTACTADOS`}
          </span>

          <div className="flex items-center gap-2">
            {!loading && hasMore && leads.length > 0 && (
              <button
                onClick={() => fetchLeads(false)}
                disabled={loadingMore}
                className="flex-shrink-0 py-2 px-3 rounded-lg font-semibold text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span>Más</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span>Más</span>
                    <svg
                      width="12"
                      height="12"
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

            <Button
              variant="outline"
              className="text-[9px] h-8 flex items-center gap-1.5 flex-shrink-0"
              onClick={handleExport}
              disabled={exporting || leads.length === 0}
            >
              {exporting ? "..." : <>📊 Excel</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
