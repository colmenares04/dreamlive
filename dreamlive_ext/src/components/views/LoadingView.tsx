export const LoadingView = () => (
  <div className="w-[420px] h-[500px] bg-bg-main p-3 relative flex flex-col">
    <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
      <div className="w-10 h-10 border-4 border-gray-300 border-t-accent rounded-full animate-spin"></div>
      <div className="text-center">
        <p className="text-sm text-gray-700 font-bold">Iniciando...</p>
        <p className="text-xs text-gray-500 font-medium animate-pulse mt-1">
          Verificando licencia
        </p>
      </div>
    </div>
  </div>
);
