import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'gray' | 'indigo' | 'blue';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    yellow: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
