interface CounterProps {
  label: string;
  count: number;
  limit?: number;
}

export const Counter = ({ label, count, limit }: CounterProps) => {
  if (label === "Enviados") {
    let getLimit = limit ? limit : 60;
    if (count >= getLimit) {
      browser.runtime.sendMessage({ type: "STOP_CONTACTING" });
      return (
        <div className="flex items-center justify-center bg-brand-gradient text-white rounded-lg py-1.5 px-2.5 text-[11px] font-semibold shadow-sm mt-1.5 w-full">
          {label}: {count}/{getLimit} (Limite alcanzado)
        </div>
      );
    }
  }
  return (
    <div className="flex items-center justify-center bg-brand-gradient text-white rounded-lg py-1.5 px-2.5 text-[11px] font-semibold shadow-sm mt-1.5 w-full">
      {label}: {count}
      {limit ? `/${limit}` : ""}
    </div>
  );
};
