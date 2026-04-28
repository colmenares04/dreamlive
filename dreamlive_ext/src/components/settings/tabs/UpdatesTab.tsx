import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { browser } from "wxt/browser";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";
import { AppVersion } from "@/types/database";
import { RefreshCw, Download, CheckCircle2, AlertCircle, Apple, Monitor, ChevronRight } from "lucide-react";

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

const ChangeBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    feat: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    fix: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    new: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    perf: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    sec: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  };

  const labels: Record<string, string> = {
    feat: "Mejora",
    fix: "Bugfix",
    new: "Nuevo",
    perf: "Velocidad",
    sec: "Seguridad",
  };

  const cleanType = type ? type.toLowerCase().trim() : "sec";

  return (
    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${styles[cleanType] || styles.sec}`}>
      {labels[cleanType] || type}
    </span>
  );
};

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
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 scale-in-center animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">v{version.version_number}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plataforma</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">✕</button>
        </div>

        <div className="p-8 grid grid-cols-1 gap-3">
          <button
            onClick={() => handleDownload(version.downloads.windows, "Windows")}
            disabled={!version.downloads.windows}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 group
              ${version.downloads.windows
                ? "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800"
                : "opacity-40 grayscale cursor-not-allowed border-slate-50"
              }`}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Monitor size={24} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Windows</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{version.downloads.windows ? "Ejecutable .exe" : "No disponible"}</span>
            </div>
          </button>

          <button
            onClick={() => handleDownload(version.downloads.macos, "MacOS")}
            disabled={!version.downloads.macos}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 group
              ${version.downloads.macos
                ? "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800"
                : "opacity-40 grayscale cursor-not-allowed border-slate-50"
              }`}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform">
              <Apple size={24} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">MacOS</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{version.downloads.macos ? "App Bundle .dmg" : "No disponible"}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export const UpdatesTab = () => {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "uptodate">("checking");
  const [latestVersion, setLatestVersion] = useState<GroupedVersion | null>(null);
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

      const groupedMap = rawVersions.reduce((acc, curr) => {
        if (!acc[curr.version_number]) {
          acc[curr.version_number] = { ...curr, downloads: {}, ids: {} };
        }
        if (curr.platform === "windows") {
          acc[curr.version_number].downloads.windows = curr.file_url;
          acc[curr.version_number].ids.windows = curr.id;
        } else if (curr.platform === "macos") {
          acc[curr.version_number].downloads.macos = curr.file_url;
          acc[curr.version_number].ids.macos = curr.id;
        }
        return acc;
      }, {} as Record<string, GroupedVersion>);

      const groupedVersions = Object.values(groupedMap).sort(
        (a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
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
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HERO SECTION */}
      <div className={`relative overflow-hidden rounded-[2rem] border-2 p-6 transition-all duration-500 shadow-2xl shadow-indigo-500/5
        ${status === "available"
          ? "bg-indigo-600 text-white border-transparent"
          : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
        }`}
      >
        <div className="flex justify-between items-center relative z-10">
          <div className="flex flex-col gap-1">
            <h2 className={`text-[10px] font-black uppercase tracking-widest ${status === "available" ? "text-indigo-200" : "text-slate-400"}`}>Instalada</h2>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black tracking-tighter">v{currentVersion}</span>
              {status === "uptodate" && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                  <CheckCircle2 size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">OK</span>
                </div>
              )}
            </div>
          </div>

          {status === "available" ? (
            <button
              onClick={() => setShowModal(true)}
              className="h-14 px-8 rounded-2xl bg-white text-indigo-600 font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Download size={16} />
              Actualizar
            </button>
          ) : (
            <button
              onClick={fetchUpdates}
              disabled={status === "checking"}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 
                ${status === "checking" ? "animate-spin border-transparent" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-500"}`}
            >
              <RefreshCw size={20} />
            </button>
          )}
        </div>
      </div>

      {/* TIMELINE */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <AlertCircle size={14} className="text-indigo-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Roadmap & Cambios</h3>
        </div>

        <div className="relative space-y-8 pl-4">
          <div className="absolute left-[1.125rem] top-3 bottom-3 w-0.5 bg-slate-100 dark:bg-slate-800" />

          {history.map((ver, idx) => {
            const isCurrent = ver.version_number === currentVersion;
            const dateStr = new Date(ver.release_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

            return (
              <div key={ver.version_number} className="relative pl-8 group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 z-10 transition-all duration-300
                  ${isCurrent 
                    ? "bg-indigo-500 border-indigo-100 dark:border-indigo-900 scale-125 shadow-lg shadow-indigo-500/30" 
                    : "bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:border-slate-300"}`} 
                />

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black tracking-tight ${isCurrent ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
                        v{ver.version_number}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
                        {dateStr}
                      </span>
                    </div>
                    <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      {ver.downloads.windows && <Monitor size={12} />}
                      {ver.downloads.macos && <Apple size={12} />}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3 group-hover:border-indigo-500/20 transition-all">
                    {ver.tags && ver.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {ver.tags.map((tag, i) => <ChangeBadge key={i} type={tag} />)}
                      </div>
                    )}
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap italic">
                      {ver.changelog || "Sin detalles adicionales."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DownloadModal isOpen={showModal} onClose={() => setShowModal(false)} version={latestVersion} />
    </div>
  );
};
