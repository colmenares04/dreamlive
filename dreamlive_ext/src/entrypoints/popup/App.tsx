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
      <div className="w-[420px] h-auto min-h-[500px] bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 relative transition-colors duration-300">
        <Toaster position="top-center" richColors theme="dark" />
        <DeviceLimitLockScreen
          onRetry={async () => {
            await browser.storage.local.remove("authError");
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-[420px] h-auto min-h-[500px] bg-white dark:bg-slate-950 p-4 font-sans text-slate-900 dark:text-slate-100 relative transition-colors duration-300">
      <Toaster position="top-center" richColors theme="dark" />
      
      <Header onOpenSettings={() => ctrl.toggleModal("config", true)} />

      {!ctrl.hasLicense ? (
        <LockView onOpenSettings={() => ctrl.toggleModal("config", true)} />
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* LIVES Card */}
          <Card title="Recopilación" subtitle="Captura usuarios en vivo.">
            <div className="flex flex-col gap-3">
              <Button 
                variant="primary" 
                onClick={ctrl.openTikTokBattles}
                className="w-full shadow-lg shadow-indigo-500/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                TikTok Live
              </Button>

              <button
                onClick={() => ctrl.toggleRecopilacion()}
                className={`group relative flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all duration-300 overflow-hidden
                  ${ctrl.isCollecting 
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30" 
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-500/50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Motor</span>
                  <span className="text-xs font-bold">{ctrl.isCollecting ? "Encendido" : "Apagado"}</span>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-500 ${ctrl.isCollecting ? "rotate-180 bg-white/20" : "bg-slate-200 dark:bg-slate-800"}`}>
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
              </button>

              <div
                onClick={() => ctrl.toggleModal("leads", true)}
                className="cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Counter label="Nuevos Leads" count={ctrl.stats.pendientes} />
              </div>
            </div>
          </Card>

          {/* Availability Card */}
          <Card title="Disponibilidad" subtitle="Validación en Backstage.">
             <div className="flex flex-col gap-3">
              <Button 
                variant="secondary" 
                onClick={ctrl.openBackstage}
                className="w-full"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Backstage
              </Button>

              <Button
                onClick={ctrl.toggleComprobacion}
                variant={ctrl.isChecking ? "danger" : "outline"}
                className={`w-full py-3 rounded-2xl ${ctrl.isChecking ? "animate-pulse" : "border-slate-200 dark:border-slate-800"}`}
              >
                {ctrl.isChecking ? "Detener" : "Comprobar"}
              </Button>

              <div
                onClick={() => ctrl.toggleModal("availables", true)}
                className="cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Counter label="Disponibles" count={ctrl.stats.disponibles} />
              </div>
            </div>
          </Card>

          {/* Activity Card */}
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
