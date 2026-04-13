import { Button } from "@/components/ui/Button";

export const LockView = ({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-[350px] space-y-4 animate-in fade-in zoom-in duration-300">
    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-3xl shadow-inner text-gray-500">
      🔒
    </div>
    <div className="text-center px-6">
      <h2 className="text-lg font-bold text-gray-700">Activación Requerida</h2>
      <p className="text-xs text-gray-500 mt-1">
        Necesitas una licencia activa para usar las herramientas.
      </p>
    </div>
    <Button
      variant="accent"
      className="px-8 shadow-lg shadow-accent/20 animate-pulse"
      onClick={onOpenSettings}
    >
      Activar Licencia
    </Button>
  </div>
);
