import React from 'react';

export function UnderConstructionView({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm animate-fade-in flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
        <i className="fas fa-hammer"></i>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md">{description}</p>
      
      <div className="mt-8 px-4 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 uppercase tracking-widest">
        En desarrollo activo
      </div>
    </div>
  );
}
