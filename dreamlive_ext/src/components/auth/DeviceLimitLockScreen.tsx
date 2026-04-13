import { Button } from "@/components/ui/Button";
import { licenseService } from "@/services/licenseService";
import { browser } from "wxt/browser";
import { useEffect, useState } from "react";

interface DeviceLimitLockScreenProps {
  onRetry: () => void;
}

export const DeviceLimitLockScreen = ({
  onRetry,
}: DeviceLimitLockScreenProps) => {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");

  useEffect(() => {
    // Get the specific error message from storage
    browser.storage.local.get("authError").then((res) => {
      const error = res.authError as string;

      // Customize message based on error type
      if (error?.includes("Límite de dispositivos")) {
        setErrorMessage("Límite de Dispositivos Alcanzado");
        setErrorDetails(
          "Tu licencia ha alcanzado el límite de dispositivos activos. Se ha detectado una nueva sesión en otro equipo.",
        );
      } else if (error?.includes("desactivada")) {
        setErrorMessage("Licencia Desactivada");
        setErrorDetails(
          "Tu licencia ha sido desactivada por el administrador. Contacta con soporte para más información.",
        );
      } else if (error?.includes("expirado") || error?.includes("expirada")) {
        setErrorMessage("Licencia Expirada");
        setErrorDetails(
          "Tu licencia ha expirado. Contacta con el administrador para renovarla.",
        );
      } else if (error?.includes("eliminada")) {
        setErrorMessage("Licencia Eliminada");
        setErrorDetails(
          "Esta licencia ha sido eliminada del sistema. Contacta con el administrador.",
        );
      } else {
        setErrorMessage("Acceso Restringido");
        setErrorDetails(
          error || "No tienes acceso a esta extensión en este momento.",
        );
      }
    });
  }, []);

  const handleLogout = async () => {
    await licenseService.removeLicense();
    await browser.storage.local.remove("authError");
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-bg-main p-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-accent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-red-500 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 flex flex-col items-center space-y-8 w-full max-w-xs">
        <div className="relative">
          <div className="w-24 h-24 bg-bg-header rounded-2xl flex items-center justify-center text-5xl shadow-2xl border border-border-subtle relative z-10">
            ⛔
          </div>
          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full z-0" />
        </div>

        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold text-text-main tracking-tight">
            {errorMessage}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {errorDetails}
          </p>
        </div>

        <div className="w-full space-y-3 pt-2">
          <Button
            variant="primary"
            onClick={onRetry}
            className="w-full h-10 justify-center font-medium shadow-lg shadow-accent/20"
          >
            Reconectar este dispositivo
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-10 justify-center text-text-muted hover:text-text-main hover:bg-bg-header transition-colors"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
};
