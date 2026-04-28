import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { licenseService, LicenseInfo } from "@/services/licenseService";
import { toast } from "sonner";
import { ShieldCheck, Monitor, LogOut, Key, Globe, User, Building, Calendar, RefreshCw } from "lucide-react";

interface LicenseTabProps {
  data: LicenseInfo | null;
  onUpdate: (newData: LicenseInfo | null) => void;
}

export const LicenseTab = ({ data, onUpdate }: LicenseTabProps) => {
  const [inputKey, setInputKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [showDevices, setShowDevices] = useState(false);
  const [isDevicesLoading, setIsDevicesLoading] = useState(false);

  const loadDevices = async () => {
    if (data) {
      try {
        setIsDevicesLoading(true);
        const sessions = await licenseService.getConnectedDevices(data.id);
        setDevices(sessions || []);
      } catch (error) {
        console.error("Error loading devices:", error);
        toast.error("Error al cargar dispositivos.");
        setDevices([]);
      } finally {
        setIsDevicesLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDevices();
  }, [data?.id]);

  const handleActivate = async () => {
    if (!inputKey.trim()) return;

    setIsLoading(true);
    const result = await licenseService.verifyLicense(inputKey);
    setIsLoading(false);

    if (result.success && result.data) {
      onUpdate(result.data);
      setInputKey("");
      toast.success("¡Licencia activada correctamente!");
    } else {
      toast.error("Error de activación", { description: result.error });
    }
  };

  const handleLogout = async () => {
    await licenseService.removeLicense();
    onUpdate(null);
    toast.info("Licencia desvinculada");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!data ? (
        <div className="flex flex-col items-center text-center py-8 gap-6">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative">
            <Key size={32} className="text-slate-400" />
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 animate-[spin_10s_linear_infinite]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Activar Software</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto leading-relaxed">
              Introduce tu clave de licencia empresarial para desbloquear todas las funciones.
            </p>
          </div>

          <div className="w-full space-y-4">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="XXXXXXXX-XXXX-XXXX"
              className="w-full h-14 px-6 text-sm font-black bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500 dark:focus:border-indigo-500 outline-none font-mono text-center uppercase tracking-[0.2em] transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />

            <Button
              variant="primary"
              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20"
              onClick={handleActivate}
              isLoading={isLoading}
            >
              Vincular Dispositivo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* STATUS BADGE */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-3xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <ShieldCheck size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">Licencia Verificada</h3>
              <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500/60 uppercase tracking-widest mt-0.5">Estado: Operativo</p>
            </div>
          </div>

          {/* LICENSE INFO GRID */}
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: "Agencia", value: data.agencyName, icon: Building },
              { label: "Reclutador", value: data.recruiterName, icon: User },
              { label: "Key", value: `•••• ${data.key.slice(-4)}`, icon: Key },
              {
                label: "Expiración",
                value: data.expirationDate ? new Date(data.expirationDate).toLocaleDateString() : "Vitalicia",
                icon: Calendar
              },
              { label: "Límite", value: `${data.maxDevices} Dispositivos`, icon: Monitor },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <row.icon size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{row.label}</span>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px] text-right">{row.value}</span>
              </div>
            ))}
          </div>

          {/* DEVICE MANAGEMENT */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-700"
              onClick={() => {
                if (!showDevices) loadDevices();
                setShowDevices(!showDevices);
              }}
            >
              {showDevices ? "Ocultar Dispositivos" : "Gestionar Dispositivos"}
            </Button>

            {showDevices && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Activos ({devices.length}/{data.maxDevices})
                  </h4>
                  <button onClick={loadDevices} className="text-indigo-500 hover:rotate-180 transition-transform duration-500">
                    <RefreshCw size={12} />
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none">
                  {isDevicesLoading ? (
                    <div className="py-8 flex justify-center">
                      <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                  ) : devices.length > 0 ? (
                    devices.map((device: any) => (
                      <div
                        key={device.id}
                        className="p-4 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[120px]">
                            {device.browser || "Browser"}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {device.os || "OS"} • {device.ip_address || "Hidden IP"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Live</span>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400">
                            {new Date(device.last_ping).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[10px] font-bold text-slate-400 py-4 italic uppercase tracking-widest">Sin otros dispositivos</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 transition-all border-none"
            onClick={handleLogout}
          >
            <LogOut size={14} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      )}
    </div>
  );
};
