import { useState, useEffect, useCallback } from "react";
import { browser } from "wxt/browser";
import { toast } from "sonner";
import { useStats } from "@/hooks/useStats";
import { licenseService } from "@/services/licenseService";
import { openBackstage, openTikTokBattles } from "@/utils/navigation";
import { SecurityService } from "@/services/security";

export const useAppController = () => {
  // --- ESTADOS UI ---
  const [modals, setModals] = useState({
    config: false,
    leads: false,
    availables: false,
    contactedTotal: false,
    todayActivity: false,
  });

  // --- ESTADOS LÓGICA ---
  const [loadingLicense, setLoadingLicense] = useState(true);
  const [hasLicense, setHasLicense] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetTime, setResetTime] = useState<string | null>(null);

  const stats = useStats();

  // --- 1. VALIDACIÓN LICENCIA ---
  const validateLicense = useCallback(async () => {
    setLoadingLicense(true);
    // await new Promise((r) => setTimeout(r, 800)); // Delay eliminado para mayor velocidad
    const data = await licenseService.getStoredLicense();

    const isValid =
      data?.isActive &&
      (!data.expirationDate || new Date(data.expirationDate) > new Date());

    setHasLicense(!!isValid);

    // 🚀 VALIDACIÓN CRÍTICA: Comprobar sesión en servidor inmediatamente
    if (isValid && data) {
      // Esto ejecutará el "Heartbeat" que verifica si la sesión sigue viva en DB.
      // Si fue expulsado, SecurityService actualizará el storage "authError" y disparará el evento.
      await SecurityService.performHeartbeat();
    }

    setLoadingLicense(false);
  }, []);

  // --- 2. LISTENERS Y EFECTOS ---

  useEffect(() => {
    validateLicense();

    // Recuperar estado inicial
    browser.storage.local
      .get(["isBackstageRunning", "isCollecting", "isContacting", "authError"])
      .then((res) => {
        setIsChecking(!!res.isBackstageRunning);
        setIsCollecting(!!res.isCollecting);
        setIsContacting(!!res.isContacting);
        if (res.authError) setAuthError(res.authError as string);
      });

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local") {
        if (changes.isBackstageRunning)
          setIsChecking(changes.isBackstageRunning.newValue);
        if (changes.isCollecting)
          setIsCollecting(changes.isCollecting.newValue);
        if (changes.isContacting)
          setIsContacting(changes.isContacting.newValue);
        if (changes.savedLicense) validateLicense();
        if (changes.authError) setAuthError(changes.authError.newValue);
      }
    };

    const messageListener = (message: any) => {
      switch (message.type) {
        case "STOP_CHECKING_UI":
          // No necesitamos setIsChecking(false) aquí porque el storage change lo hará
          // pero por reactividad inmediata lo dejamos si queremos, aunque
          // lo ideal es confiar en el storage listener o actualizar ambos.
          setIsChecking(false);
          browser.storage.local.set({ isBackstageRunning: false });
          break;
        case "LIMIT_REACHED":
          setResetTime(message.resetIn);
          setIsContacting(false);
          browser.storage.local.set({ isContacting: false });
          break;
        case "BATCH_COMPLETED":
          setIsContacting(false);
          browser.storage.local.set({ isContacting: false });
          toast.success("Fin del ciclo", {
            description: `Enviados: ${message.stats?.enviados || 0} | Errores: ${message.stats?.errores || 0}`,
          });
          break;
        case "LICENSE_VALIDATION_FAILED":
          toast.error("Licencia inválida", {
            description: message.error || "Tu licencia ha sido desactivada.",
          });
          // Force re-validation
          validateLicense();
          break;
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [validateLicense]);

  // --- 3. HANDLERS (ACCIONES) ---
  const toggleRecopilacion = async () => {
    const newState = !isCollecting;
    setIsCollecting(newState);
    await browser.storage.local.set({ isCollecting: newState });
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tabs[0]?.url?.includes("tiktok.com")) {
        toast.error("Navega a TikTok LIVE");
        setIsCollecting(!newState); // Revertir visualmente
        await browser.storage.local.set({ isCollecting: !newState }); // Revertir storage
        return;
      }
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: "toggleRecopilacion",
          status: newState,
        });
      }
    } catch (e) {
      setIsCollecting(!newState);
      await browser.storage.local.set({ isCollecting: !newState });
    }
  };

  const toggleComprobacion = async () => {
    const newState = !isChecking;
    if (newState) {
      // Validate license before starting
      const validation = await licenseService.validateLicenseBeforeAction();
      if (!validation.isValid) {
        toast.error("Licencia inválida", {
          description: validation.error || "Tu licencia ha sido desactivada.",
        });
        validateLicense(); // Force re-validation
        return;
      }

      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (
        !tabs[0]?.url?.includes(
          "live-backstage.tiktok.com/portal/anchor/relation",
        )
      ) {
        toast.warning("Ubicación incorrecta", {
          action: { label: "Ir ahora", onClick: () => openBackstage() },
        });
        return;
      }
    }
    setIsChecking(newState);
    await browser.storage.local.set({ isBackstageRunning: newState });
    browser.runtime.sendMessage({
      type: newState ? "START_CHECKING_BACKSTAGE" : "STOP_CHECKING",
    });
  };
  const handleStopContact = async () => {
    setIsContacting(false); // Desbloquea UI visualmente
    await browser.storage.local.set({ isContacting: false });
    await browser.runtime.sendMessage({ type: "STOP_CONTACTING" });
    toast.info("Deteniendo...", {
      description: "La secuencia se detendrá al finalizar la acción actual.",
    });
  };
  const handleStartContact = async () => {
    if (isContacting) return;

    // Validate license before starting
    const validation = await licenseService.validateLicenseBeforeAction();
    if (!validation.isValid) {
      toast.error("Licencia inválida", {
        description: validation.error || "Tu licencia ha sido desactivada.",
      });
      validateLicense(); // Force re-validation
      return;
    }

    // Validaciones
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tabs[0]?.url?.includes(
        "live-backstage.tiktok.com/portal/anchor/instant-messages",
      )
    ) {
      toast.warning("Ve a la sección Mensajes", {
        action: {
          label: "Ir ➡️",
          onClick: () =>
            browser.tabs.create({
              url: "https://live-backstage.tiktok.com/portal/anchor/instant-messages",
            }),
        },
      });
      return;
    }

    if (stats.disponibles === 0) {
      toast.error("No hay usuarios disponibles.");
      return;
    }
    if (resetTime) {
      toast.error(`Enfriamiento activo: ${resetTime}`);
      return;
    }

    setIsContacting(true);
    await browser.storage.local.set({ isContacting: true });
    await browser.runtime.sendMessage({ type: "START_CONTACTING" });
    toast.success("🚀 Iniciando automatización...");
  };

  // Helpers para modales
  const toggleModal = (key: keyof typeof modals, value: boolean) => {
    setModals((prev) => ({ ...prev, [key]: value }));
  };

  return {
    // Estado
    modals,
    loadingLicense,
    hasLicense,
    stats,
    isCollecting,
    isChecking,
    isContacting,
    authError,
    resetTime,
    // Acciones
    toggleModal,
    validateLicense,
    toggleRecopilacion,
    toggleComprobacion,
    handleStartContact,
    openBackstage,
    openTikTokBattles,
    handleStopContact,
    refreshStats: stats.refreshStats,
  };
};
