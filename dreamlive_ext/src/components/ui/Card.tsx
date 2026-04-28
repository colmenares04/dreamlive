import React from 'react';

interface CardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, fullWidth = false }) => (
  <div className={`group flex flex-col p-4 rounded-2xl transition-all duration-300 border shadow-sm
    ${fullWidth ? 'col-span-2' : 'col-span-1'}
    bg-white border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300
    dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:shadow-indigo-500/10`}>
    <div className="flex flex-col mb-4">
      <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">{title}</h2>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-tight">{subtitle}</p>
    </div>
    <div className="flex-1">
      {children}
    </div>
  </div>
);