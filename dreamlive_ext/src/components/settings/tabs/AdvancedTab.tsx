import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";
import { toast } from "sonner";
import { Lock, Unlock, User, MessageSquare, Timer, ShieldAlert, LogOut } from "lucide-react";

export const AdvancedTab = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState({
    recruiter_name: "",
    limit_requests: 60,
    refresh_minutes: 720,
    admin_password: "",
  });

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
      if (!license) return;

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

      import("wxt/browser").then(({ browser }) => {
        browser.runtime.sendMessage({ type: "CONFIG_UPDATED" });
      });

      toast.success("Configuración actualizada correctamente");
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLocked ? (
        <div className="flex flex-col items-center text-center py-12 gap-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <Lock size={32} className="text-slate-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Panel Restringido</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Solo Personal Autorizado</p>
          </div>

          <div className="w-full max-w-[240px] space-y-4 px-6">
            <input
              type="password"
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full h-12 px-6 text-center text-sm font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all placeholder:text-slate-200"
            />
            <Button
              onClick={handleUnlock}
              variant="primary"
              className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20"
            >
              Desbloquear
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-5 rounded-3xl">
             <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                <Unlock size={20} />
             </div>
             <div className="flex flex-col">
                <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tight">Acceso Maestro</h3>
                <p className="text-[9px] font-bold text-indigo-600/70 dark:text-indigo-500/60 uppercase tracking-widest">Configuración Crítica</p>
             </div>
          </div>

          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            {/* RECRUITER NAME */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <User size={12} className="text-slate-400" />
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Identidad Reclutador</label>
              </div>
              <input
                type="text"
                value={config.recruiter_name}
                onChange={(e) => setConfig({ ...config, recruiter_name: e.target.value })}
                className="w-full h-12 px-5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all"
                placeholder="Nombre oficial"
              />
            </div>

            {/* LIMITS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <MessageSquare size={12} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Límite Msg</label>
                </div>
                <input
                  type="number"
                  value={config.limit_requests}
                  onChange={(e) => setConfig({ ...config, limit_requests: parseInt(e.target.value) })}
                  className="w-full h-12 px-5 text-xs font-black bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Timer size={12} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Reset (Min)</label>
                </div>
                <input
                  type="number"
                  value={config.refresh_minutes}
                  onChange={(e) => setConfig({ ...config, refresh_minutes: parseInt(e.target.value) })}
                  className="w-full h-12 px-5 text-xs font-black bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* MASTER PASSWORD */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 px-1">
                <ShieldAlert size={12} className="text-rose-500" />
                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Clave de Seguridad Maestro</label>
              </div>
              <input
                type="text"
                value={config.admin_password}
                onChange={(e) => setConfig({ ...config, admin_password: e.target.value })}
                className="w-full h-12 px-5 text-xs font-black bg-white dark:bg-slate-900 text-rose-600 border border-rose-100 dark:border-rose-900/30 rounded-2xl outline-none focus:border-rose-500 transition-all text-center font-mono"
              />
            </div>

            <Button
              onClick={handleSave}
              isLoading={loading}
              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10"
            >
              Sincronizar Global
            </Button>
          </div>

          <button
            onClick={() => setIsLocked(true)}
            className="w-full flex items-center justify-center gap-2 py-4 text-[10px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-[0.2em]"
          >
            <LogOut size={14} />
            Cerrar Sesión Segura
          </button>
        </div>
      )}
    </div>
  );
};
