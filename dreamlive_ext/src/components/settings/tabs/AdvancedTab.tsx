import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";
import { toast } from "sonner";

export const AdvancedTab = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados de configuración
  const [config, setConfig] = useState({
    recruiter_name: "",
    limit_requests: 60,
    refresh_minutes: 720,
    admin_password: "",
  });

  // 1. Cargar datos iniciales
  const loadConfig = async () => {
    const license = await licenseService.getStoredLicense();
    const { data } = await (supabase.from("licenses") as any)
      .select("recruiter_name, limit_requests, refresh_minutes, admin_password")
      .eq("license_key", (license as any)?.key)
      .single();

    if (data) setConfig(data);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleUnlock = () => {
    if (passwordInput === config.admin_password) {
      setIsLocked(false);
      toast.success("Panel desbloqueado");
    } else {
      toast.error("Contraseña de administrador incorrecta");
    }
  };
  const handleSave = async () => {
    setLoading(true);
    try {
      const license = await licenseService.getStoredLicense();
      if (!license) return; // Validación extra
      // 1. Actualizar en Supabase
      const { error } = await (supabase.from("licenses") as any)
        .update({
          recruiter_name: config.recruiter_name,
          limit_requests: config.limit_requests,
          refresh_minutes: config.refresh_minutes,
          admin_password: config.admin_password,
        })
        .eq("license_key", license.key);

      if (error) throw error;
      await licenseService.verifyLicense(license.key);

      // Notificar a toda la extension para recargar visualmente los limites
      browser.runtime.sendMessage({ type: "CONFIG_UPDATED" });

      toast.success("Configuración actualizada correctamente");
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {isLocked ? (
        /* VISTA BLOQUEADA (Tu estilo original) */
        <div className="text-center py-8 space-y-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-3xl">🔑</div>
          <div>
            <h3 className="text-[11px] font-black uppercase text-gray-400">
              Acceso Restringido
            </h3>
            <p className="text-[10px] text-gray-400">
              Solo personal autorizado
            </p>
          </div>
          <div className="max-w-[200px] mx-auto space-y-2 px-4">
            <input
              type="password"
              placeholder="Clave de administrador"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full p-2 text-center text-xs border rounded-xl outline-none focus:border-blue-500 transition-all"
            />
            <Button
              onClick={handleUnlock}
              className="w-full bg-gray-800 text-white py-2 rounded-xl text-[10px] font-bold"
            >
              Desbloquear Panel
            </Button>
          </div>
        </div>
      ) : (
        /* VISTA DESBLOQUEADA */
        <div className="space-y-4">
          <div className="grid gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            {/* NOMBRE DEL RECLUTADOR */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Nombre del Reclutador
              </label>
              <input
                type="text"
                value={config.recruiter_name}
                onChange={(e) =>
                  setConfig({ ...config, recruiter_name: e.target.value })
                }
                className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                placeholder="Ej: Russo Admin"
              />
            </div>

            {/* LÍMITES Y TIEMPO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Límite Mensajes
                </label>
                <input
                  type="number"
                  value={config.limit_requests}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      limit_requests: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Refresco (Min)
                </label>
                <input
                  type="number"
                  value={config.refresh_minutes}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      refresh_minutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* CAMBIAR CLAVE ADMIN */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-400 uppercase ml-1 text-center block">
                Nueva Clave de Panel
              </label>
              <input
                type="text"
                value={config.admin_password}
                onChange={(e) =>
                  setConfig({ ...config, admin_password: e.target.value })
                }
                className="w-full p-2.5 text-xs bg-white border border-red-100 rounded-xl outline-none focus:border-red-500 text-center font-mono"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all text-[11px]"
            >
              {loading ? "Guardando..." : "Actualizar Configuración Maestra"}
            </Button>
          </div>

          <button
            onClick={() => setIsLocked(true)}
            className="w-full text-[9px] text-gray-300 hover:text-gray-500 uppercase font-bold tracking-widest"
          >
            🔒 Volver a Bloquear
          </button>
        </div>
      )}
    </div>
  );
};
