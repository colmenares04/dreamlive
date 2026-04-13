import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { licenseService, LicenseInfo } from "@/services/licenseService";
import { toast } from "sonner";

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
        console.log("🔄 Fetching devices for license:", data.id);

        const sessions = await licenseService.getConnectedDevices(data.id);
        console.log("📱 Devices fetched:", sessions);
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

  // Cargar dispositivos al montar si hay licencia y multisesión
  useEffect(() => {
    loadDevices();
  }, [data?.id]); // Dependencia del ID

  const handleActivate = async () => {
    if (!inputKey.trim()) return;

    setIsLoading(true);
    const result = await licenseService.verifyLicense(inputKey);
    setIsLoading(false);

    if (result.success && result.data) {
      onUpdate(result.data); // Actualizamos al padre
      setInputKey("");
    } else {
      toast.error("Error de activación", { description: result.error });
    }
  };

  const handleLogout = async () => {
    await licenseService.removeLicense();
    onUpdate(null); // Actualizamos al padre
    toast.info("Licencia desvinculada");
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {!data ? (
        // --- VISTA: NO ACTIVADO ---
        <div className="text-center space-y-4 py-4">
          <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-2xl">
            🔑
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-main">
              Activar Producto
            </h3>
            <p className="text-[10px] text-text-soft">
              Ingresa tu clave de licencia para comenzar.
            </p>
          </div>

          <div className="px-4">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="LICENSE-KEY-..."
              className="w-full p-3 text-xs bg-[#2d2d2d] text-white border border-gray-600 rounded-lg focus:border-accent outline-none font-mono text-center uppercase tracking-widest"
            />
          </div>

          <Button
            variant="accent"
            className="w-full justify-center py-2"
            onClick={handleActivate}
            disabled={isLoading}
          >
            {isLoading ? "Verificando..." : "Activar Licencia"}
          </Button>
        </div>
      ) : (
        // --- VISTA: ACTIVADO ---
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
            <div className="text-xl">✅</div>
            <div>
              <h3 className="text-xs font-bold text-green-800">
                Licencia Activa
              </h3>
              <p className="text-[10px] text-green-700">
                Dispositivo autorizado
              </p>
            </div>
          </div>

          {[
            { label: "Agencia", value: data.agencyName },
            { label: "Reclutador", value: data.recruiterName },
            {
              label: "Licencia",
              value: "•••• " + data.key.slice(-4),
            },
            {
              label: "Vence",
              value: data.expirationDate
                ? new Date(data.expirationDate).toLocaleDateString()
                : "De por vida",
            },
            {
              label: "Límite Disp.",
              value: `${data.maxDevices} dispositivo(s)`,
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between border-b border-border py-2 text-[11px]"
            >
              <strong className="text-text-main">{row.label}</strong>
              <span className="text-text-soft font-mono text-right">
                {row.value}
              </span>
            </div>
          ))}

          {/* --- BOTÓN VER DISPOSITIVOS --- */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full justify-center text-xs h-8"
              onClick={() => {
                if (!showDevices) loadDevices();
                setShowDevices(!showDevices);
              }}
            >
              {showDevices
                ? "Ocultar Dispositivos"
                : "Ver Dispositivos Conectados"}
            </Button>
          </div>

          {/* --- LISTA DE DISPOSITIVOS --- */}
          {showDevices && (
            <div className="mt-2 text-[10px] animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-text-main">
                  Lista de Sesiones ({devices.length}/{data.maxDevices})
                </h4>
                <Button
                  variant="outline"
                  className="h-5 w-5 p-0"
                  onClick={loadDevices}
                >
                  🔄
                </Button>
              </div>

              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 dl-scroll">
                {!isDevicesLoading &&
                  devices.length > 0 &&
                  devices.map((device: any) => (
                    <div
                      key={device.id}
                      className="bg-bg-card p-2 rounded border border-border text-[10px]"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-text-main truncate max-w-[120px]">
                          {device.browser || "Navegador Desconocido"}
                        </span>
                        <span className="text-text-soft">
                          {device.os || "S.O. Desconocido"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-text-soft">
                        <span className="font-mono">
                          {device.ip_address || "IP Oculta"}
                        </span>
                        <span>
                          {new Date(device.last_ping).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}

                {isDevicesLoading && (
                  <p className="text-center text-text-soft italic text-[10px] py-2">
                    Cargando lista...
                  </p>
                )}

                {!isDevicesLoading && devices.length === 0 && (
                  <p className="text-center text-text-soft italic text-[10px] py-2">
                    No hay dispositivos conectados.
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            variant="danger"
            className="w-full justify-center mt-4"
            onClick={handleLogout}
          >
            Desvincular Licencia
          </Button>
        </div>
      )}
    </div>
  );
};
