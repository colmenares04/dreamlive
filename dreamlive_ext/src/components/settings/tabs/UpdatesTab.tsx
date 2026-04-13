import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { browser } from "wxt/browser";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";
import { AppVersion } from "@/types/database"; // Asegúrate que este tipo tenga 'platform'

// --- TIPOS ---
// Extendemos la interfaz base para manejar la agrupación visual
interface GroupedVersion extends Omit<
  AppVersion,
  "id" | "file_url" | "platform" | "file_size_kb"
> {
  downloads: {
    windows?: string;
    macos?: string;
  };
  ids: {
    windows?: string;
    macos?: string;
  };
}

// --- HELPER VERSIONES ---
const isVersionNewer = (remote: string, local: string) => {
  if (!remote || !local) return false;
  const v1 = remote.split(".").map(Number);
  const v2 = local.split(".").map(Number);
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }
  return false;
};

// --- COMPONENTE BADGE ---
const ChangeBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    feat: "bg-amber-100 text-amber-700 border-amber-200",
    fix: "bg-red-100 text-red-700 border-red-200",
    new: "bg-blue-100 text-blue-700 border-blue-200",
    perf: "bg-green-100 text-green-700 border-green-200",
    sec: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const labels: Record<string, string> = {
    feat: "MEJORAS",
    fix: "ARREGLO",
    new: "NOVEDAD",
    perf: "OPTIMIZACION",
    sec: "SEGURIDAD",
  };

  const cleanType = type ? type.toLowerCase().trim() : "sec";

  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${styles[cleanType] || styles.sec}`}
    >
      {labels[cleanType] || type}
    </span>
  );
};

// --- COMPONENTE MODAL DE DESCARGA ---
const DownloadModal = ({
  isOpen,
  onClose,
  version,
}: {
  isOpen: boolean;
  onClose: () => void;
  version: GroupedVersion | null;
}) => {
  if (!isOpen || !version) return null;

  const handleDownload = (url: string | undefined, platformName: string) => {
    if (url) {
      window.open(url, "_blank");
      toast.success(`Descargando versión para ${platformName}...`);
      onClose();
    } else {
      toast.error(`No hay versión disponible para ${platformName}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">
              Descargar v{version.version_number}
            </h3>
            <p className="text-xs text-gray-500">
              Selecciona tu sistema operativo
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-800 text-gray-200 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Opciones */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {/* Opción Windows */}
          <button
            onClick={() => handleDownload(version.downloads.windows, "Windows")}
            disabled={!version.downloads.windows}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
              version.downloads.windows
                ? "bg-gray-300 border-gray-100 hover:border-blue-500 hover:bg-blue-50 cursor-pointer group"
                : "border-gray-100 opacity-50 cursor-not-allowed bg-gray-50"
            }`}
          >
            {/* Icono Windows Simple (SVG) */}
            <svg
              className={`w-8 h-8 mb-2 ${version.downloads.windows ? "text-blue-600" : "text-gray-400"}`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.551L24 0v11.551H10.949V1.898zM0 12.45h9.75v9.451L0 20.55V12.45zm10.949 0H24v11.551l-13.051-1.898V12.45z" />
            </svg>
            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">
              Windows
            </span>
            {!version.downloads.windows && (
              <span className="text-[9px] text-red-400 mt-1">
                No disponible
              </span>
            )}
          </button>

          {/* Opción Mac */}
          <button
            onClick={() => handleDownload(version.downloads.macos, "MacOS")}
            disabled={!version.downloads.macos}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
              version.downloads.macos
                ? "bg-gray-300 border-gray-100 hover:border-gray-800 hover:bg-gray-100 cursor-pointer group"
                : " border-gray-100 opacity-50 cursor-not-allowed bg-gray-50"
            }`}
          >
            {/* Icono Apple Simple (SVG) */}
            <svg
              className={`w-8 h-8 mb-2 ${version.downloads.macos ? "text-gray-800" : "text-gray-400"}`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-1.29 4.36-1.29c.64.03 2.19.16 3.32 1.3-3.69 1.77-2.9 6.27.76 7.72-.6 2.37-1.77 4.12-3.52 4.5zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
              MacOS
            </span>
            {!version.downloads.macos && (
              <span className="text-[9px] text-red-400 mt-1">
                No disponible
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const UpdatesTab = () => {
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "uptodate"
  >("checking");
  const [latestVersion, setLatestVersion] = useState<GroupedVersion | null>(
    null,
  );
  const [history, setHistory] = useState<GroupedVersion[]>([]);
  const [showModal, setShowModal] = useState(false);

  const currentVersion = browser.runtime.getManifest()?.version || "0.0.0";

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setStatus("checking");
    try {
      const { data, error } = await supabase
        .from("app_versions")
        .select("*")
        .eq("is_active", true)
        .order("release_date", { ascending: false });

      if (error) throw error;

      const rawVersions = (data || []) as unknown as AppVersion[];

      // --- LÓGICA DE AGRUPACIÓN (CRUCIAL PARA DUAL PLATFORM) ---
      // Convertimos la lista plana (donde hay filas separadas para win/mac) en una lista agrupada por número de versión
      const groupedMap = rawVersions.reduce(
        (acc, curr) => {
          if (!acc[curr.version_number]) {
            acc[curr.version_number] = {
              ...curr,
              downloads: {},
              ids: {},
            };
          }
          // Asignar URL según plataforma
          if (curr.platform === "windows") {
            acc[curr.version_number].downloads.windows = curr.file_url;
            acc[curr.version_number].ids.windows = curr.id;
          } else if (curr.platform === "macos") {
            acc[curr.version_number].downloads.macos = curr.file_url;
            acc[curr.version_number].ids.macos = curr.id;
          }
          return acc;
        },
        {} as Record<string, GroupedVersion>,
      );

      const groupedVersions = Object.values(groupedMap).sort(
        (a, b) =>
          new Date(b.release_date).getTime() -
          new Date(a.release_date).getTime(),
      );

      if (groupedVersions.length > 0) {
        setHistory(groupedVersions);
        const latest = groupedVersions[0];

        if (latest && isVersionNewer(latest.version_number, currentVersion)) {
          setStatus("available");
          setLatestVersion(latest);
          toast.info(`Nueva versión ${latest.version_number} disponible`);
        } else {
          setStatus("uptodate");
        }
      } else {
        setStatus("uptodate");
      }
    } catch (err) {
      console.error("Error buscando actualizaciones:", err);
      setStatus("idle");
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* 1. HERO SECTION */}
        <div
          className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
            status === "available"
              ? "bg-green-50/80 border-green-200 shadow-sm"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center z-10 relative">
            <div>
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Versión Instalada
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-800 tracking-tight">
                  v{currentVersion}
                </span>
                {status === "uptodate" && (
                  <span className="text-[9px] text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                    ACTUALIZADO
                  </span>
                )}
              </div>
            </div>

            {status === "available" ? (
              <div className="text-right">
                <p className="text-[10px] font-bold text-green-600 mb-1">
                  v{latestVersion?.version_number} disponible
                </p>
                <Button
                  onClick={() => setShowModal(true)} // Abrimos el modal en lugar de descargar directo
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200/50 animate-pulse text-xs h-8 px-4"
                >
                  ⬇ Descargar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {status === "checking" ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="animate-spin">⏳</span> Verificando...
                  </div>
                ) : (
                  <button
                    onClick={fetchUpdates}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-accent hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                    title="Buscar actualizaciones"
                  >
                    🔄
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. TIMELINE */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
            Historial de Cambios
          </h3>

          <div className="relative pl-2">
            <div className="absolute left-[7px] top-2 bottom-4 w-[1px] bg-gray-200"></div>

            <div className="space-y-6">
              {history.map((ver) => {
                const isCurrent = ver.version_number === currentVersion;
                const dateStr = new Date(ver.release_date).toLocaleDateString(
                  undefined,
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                );

                return (
                  <div key={ver.version_number} className="relative pl-6 group">
                    <div
                      className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 z-10 ${
                        isCurrent
                          ? "bg-accent border-white shadow-md shadow-accent/30"
                          : "bg-gray-200 border-white"
                      }`}
                    ></div>

                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span
                        className={`text-sm font-bold ${
                          isCurrent ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        v{ver.version_number}
                      </span>
                      <span className="text-[9px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 rounded">
                        {dateStr}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                          ACTUAL
                        </span>
                      )}

                      {/* Indicadores de plataformas disponibles en el historial */}
                      <div className="flex gap-1 ml-auto opacity-50">
                        {ver.downloads.windows && (
                          <i
                            className="fa-brands fa-windows text-xs text-blue-400"
                            title="Win Available"
                          ></i>
                        )}
                        {ver.downloads.macos && (
                          <i
                            className="fa-brands fa-apple text-xs text-gray-400"
                            title="Mac Available"
                          ></i>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {ver.tags && ver.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-1">
                          {ver.tags.map((tag, idx) => (
                            <ChangeBadge key={idx} type={tag} />
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {ver.changelog || "Sin detalles técnicos."}
                      </p>
                    </div>
                  </div>
                );
              })}

              {history.length === 0 && status !== "checking" && (
                <p className="text-xs text-gray-400 pl-6 italic">
                  No hay historial disponible.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RENDERIZAMOS EL MODAL AL FINAL DEL COMPONENTE */}
      <DownloadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        version={latestVersion}
      />
    </>
  );
};
