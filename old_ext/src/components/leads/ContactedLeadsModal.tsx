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
      }
    );
  };

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

  const handleExport = async () => {
    if (leads.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    setExporting(true);
    try {
      const license = await licenseService.getStoredLicense();
      const agencyName = license?.agencyName || "Agencia Desconocida";
      const recruiterName = license?.recruiterName || "Reclutador";

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Reporte de Actividad");

      const headerStyle = {
        font: { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } },
        alignment: { vertical: "middle", horizontal: "center" },
      } as const;

      const subHeaderStyle = {
        font: { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } },
        alignment: { vertical: "middle", horizontal: "left" },
      } as const;

      const tableHeaderStyle = {
        font: { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: { bottom: { style: "medium", color: { argb: "FFFFFFFF" } } },
      } as const;

      sheet.mergeCells("A1:E2");
      const titleCell = sheet.getCell("A1");
      titleCell.value = `REPORTE DE ACTIVIDAD - ${agencyName.toUpperCase()}`;
      titleCell.style = headerStyle;

      sheet.mergeCells("A3:E3");
      sheet.getCell("A3").value = `Reclutador: ${recruiterName} | Fecha de Emisión: ${new Date().toLocaleDateString()}`;
      sheet.getCell("A3").style = subHeaderStyle;
      sheet.getRow(3).height = 20;

      sheet.addRow([]);

      sheet.getRow(5).values = ["Usuario TikTok", "Espectadores", "Likes", "Fecha de Contacto", "Hora"];
      ["A5", "B5", "C5", "D5", "E5"].forEach((key) => {
        sheet.getCell(key).style = tableHeaderStyle;
      });
      sheet.getRow(5).height = 25;

      leads.forEach((lead) => {
        const dateObj = new Date(lead.contacted_at);
        const row = sheet.addRow([
          `@${lead.username}`,
          lead.viewer_count || 0,
          lead.likes_count || 0,
          dateObj.toLocaleDateString(),
          dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ]);

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

      sheet.getColumn(1).width = 25;
      sheet.getColumn(2).width = 15;
      sheet.getColumn(3).width = 15;
      sheet.getColumn(4).width = 20;
      sheet.getColumn(5).width = 15;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 scale-in-center animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
               {mode === "today" ? "Actividad Hoy" : "Historial"}
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Control de leads contactados exitosamente.</p>
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
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Consultando historial...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl">
                📜
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Historial Vacío</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Aún no has contactado a ningún lead.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {leads.map((lead) => {
                const dateObj = new Date(lead.contacted_at);
                return (
                  <div
                    key={lead.id}
                    className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">@{lead.username}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                          {dateObj.toLocaleString([], {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {lead.viewer_count > 0 && (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            👁️ {lead.viewer_count.toLocaleString()}
                          </span>
                        )}
                        {lead.likes_count > 0 && (
                          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                            ❤️ {lead.likes_count.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(lead.id, lead.username)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar del Historial"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {loading ? "Calculando..." : `Total: ${totalCount} Registros`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!loading && hasMore && leads.length > 0 && (
              <Button
                variant="outline"
                onClick={() => fetchLeads(false)}
                isLoading={loadingMore}
                className="rounded-xl px-4 border-slate-200 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest h-9"
              >
                Cargar Más
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handleExport}
              isLoading={exporting}
              disabled={leads.length === 0}
              className="rounded-xl px-4 font-black text-[10px] uppercase tracking-widest h-9 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
