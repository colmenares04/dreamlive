import { Button } from "@/components/ui/Button";
import { licenseService } from "@/services/licenseService";
import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCcw, LogOut } from "lucide-react";

interface DeviceLimitLockScreenProps {
  onRetry: () => void;
}

export const DeviceLimitLockScreen = ({
  onRetry,
}: DeviceLimitLockScreenProps) => {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");

  useEffect(() => {
    import("wxt/browser").then(({ browser }) => {
      browser.storage.local.get("authError").then((res) => {
        const error = res.authError as string;

        if (error?.includes("Límite de dispositivos")) {
          setErrorMessage("Límite de Dispositivos");
          setErrorDetails("Has alcanzado el máximo permitido para tu plan. Se ha detectado una sesión activa en otro equipo.");
        } else if (error?.includes("desactivada")) {
          setErrorMessage("Licencia Suspendida");
          setErrorDetails("Tu acceso ha sido revocado por el administrador. Por favor, contacta con soporte técnico.");
        } else if (error?.includes("expirado") || error?.includes("expirada")) {
          setErrorMessage("Suscripción Expirada");
          setErrorDetails("Tu periodo de servicio ha finalizado. Renueva tu licencia para continuar operando.");
        } else if (error?.includes("eliminada")) {
          setErrorMessage("Acceso Eliminado");
          setErrorDetails("Esta licencia ya no existe en nuestros registros. Contacta con tu agencia.");
        } else {
          setErrorMessage("Acceso Denegado");
          setErrorDetails(error || "No tienes permisos para acceder a la plataforma en este momento.");
        }
      });
    });
  }, []);

  const handleLogout = async () => {
    await licenseService.removeLicense();
    import("wxt/browser").then(async ({ browser }) => {
      await browser.storage.local.remove("authError");
      window.location.reload();
    });
  };

  return (
    <div className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-8 overflow-hidden">
      {/* BACKGROUND DECO */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-rose-500/10 dark:bg-rose-500/5 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center gap-10 animate-in zoom-in-95 fade-in duration-700">
        <div className="relative group">
          <div className="w-28 h-28 bg-rose-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-rose-500/40 rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <ShieldAlert size={56} strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            {errorMessage}
          </h2>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            {errorDetails}
          </p>
        </div>

        <div className="w-full space-y-4">
          <Button
            variant="primary"
            onClick={onRetry}
            className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3"
          >
            <RefreshCcw size={16} />
            Reconectar Sesión
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-3"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </Button>
        </div>

        <div className="pt-8">
           <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">DreamLive Security System</p>
        </div>
      </div>
    </div>
  );
};
