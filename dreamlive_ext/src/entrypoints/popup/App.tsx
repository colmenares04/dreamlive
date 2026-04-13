import { Header } from "@/components/dashboard/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Counter } from "@/components/ui/Counter";
import { Toaster } from "sonner";
import { browser } from "wxt/browser";

// Hooks y Controladores
import { useAppController } from "@/hooks/useAppController";

// Componentes Visuales Extraídos
import { LoadingView } from "@/components/views/LoadingView";
import { LockView } from "@/components/views/LockView";
import { DeviceLimitLockScreen } from "@/components/auth/DeviceLimitLockScreen";
import { ActivityCard } from "@/components/dashboard/ActivityCard";

// Modales
import { SettingsModal } from "@/components/settings/SettingsModal";
import { LeadsListModal } from "@/components/leads/LeadsListModal";
import { AvailableLeadsModal } from "@/components/leads/AvailableLeadsModal";
import { ContactedLeadsModal } from "@/components/leads/ContactedLeadsModal";

import "./style.css";

export default function App() {
  const ctrl = useAppController();

  // 1. Loading
  if (ctrl.loadingLicense) return <LoadingView />;

  // 2. Auth Error (Device Limit / Blocked)
  if (ctrl.authError) {
    return (
      <div className="w-[420px] h-auto min-h-[500px] bg-bg-main font-sans text-text-main relative">
        <Toaster position="top-center" richColors theme="dark" />
        <DeviceLimitLockScreen
          onRetry={async () => {
            // Reintentar es básicamente recargar, esperando que el usuario haya resuelto algo
            // o simplemente para volver a validar.
            await browser.storage.local.remove("authError");
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-[420px] h-auto min-h-[500px] bg-bg-main p-3 font-sans text-text-main relative">
      <Toaster position="top-center" richColors theme="dark" />
      <Header onOpenSettings={() => ctrl.toggleModal("config", true)} />

      {!ctrl.hasLicense ? (
        // 3. Sin Licencia
        <LockView onOpenSettings={() => ctrl.toggleModal("config", true)} />
      ) : (
        // 4. Dashboard
        <div className="grid grid-cols-2 gap-2 mb-2 animate-in slide-in-from-bottom-2 duration-300">
          {/* LIVES Card */}
          <Card title="LIVES y recopilación" subtitle="Captura usuarios.">
            <Button onClick={ctrl.openTikTokBattles}>Ir a los LIVES</Button>
            <div className="mt-1.5">
              <label
                className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors text-white ${ctrl.isCollecting ? "bg-accent shadow-inner ring-2 ring-accent/30" : "bg-primary"}`}
              >
                <span>
                  {ctrl.isCollecting ? "Recopilando..." : "Recopilar"}
                </span>
                <input
                  type="checkbox"
                  checked={ctrl.isCollecting}
                  onChange={ctrl.toggleRecopilacion}
                  className="w-3.5 h-3.5 accent-white cursor-pointer"
                />
              </label>
            </div>
            <div
              onClick={() => ctrl.toggleModal("leads", true)}
              className="cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
            >
              <Counter label="Pendientes" count={ctrl.stats.pendientes} />
            </div>
          </Card>

          {/* Availability Card */}
          <Card title="Disponibilidad" subtitle="Comprueba en Backstage.">
            <div className="space-y-1.5">
              <Button onClick={ctrl.openBackstage}>Backstage</Button>
              <Button
                onClick={ctrl.toggleComprobacion}
                variant={ctrl.isChecking ? "danger" : "primary"}
                className={ctrl.isChecking ? "animate-pulse" : ""}
              >
                {ctrl.isChecking ? "🛑 Detener" : "Comprobar"}
              </Button>
            </div>
            <div
              onClick={() => ctrl.toggleModal("availables", true)}
              className="cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
            >
              <Counter label="Disponibles" count={ctrl.stats.disponibles} />
            </div>
          </Card>

          {/* Activity Card (Modularizada) */}
          <ActivityCard
            isContacting={ctrl.isContacting}
            resetTime={ctrl.resetTime}
            stats={ctrl.stats}
            onStart={ctrl.handleStartContact}
            onStopContact={ctrl.handleStopContact}
            onShowToday={() => ctrl.toggleModal("todayActivity", true)}
            onShowTotal={() => ctrl.toggleModal("contactedTotal", true)}
          />
        </div>
      )}

      {/* --- MODALES --- */}
      <SettingsModal
        isOpen={ctrl.modals.config}
        onClose={() => ctrl.toggleModal("config", false)}
        onLicenseUpdate={ctrl.validateLicense}
      />
      <LeadsListModal
        isOpen={ctrl.modals.leads}
        onClose={() => ctrl.toggleModal("leads", false)}
        onLeadDeleted={ctrl.refreshStats}
      />
      <AvailableLeadsModal
        isOpen={ctrl.modals.availables}
        onClose={() => ctrl.toggleModal("availables", false)}
        onLeadDeleted={ctrl.refreshStats}
      />
      <ContactedLeadsModal
        isOpen={ctrl.modals.contactedTotal}
        onClose={() => ctrl.toggleModal("contactedTotal", false)}
        mode="all"
      />
      <ContactedLeadsModal
        isOpen={ctrl.modals.todayActivity}
        onClose={() => ctrl.toggleModal("todayActivity", false)}
        mode="today"
      />
    </div>
  );
}
