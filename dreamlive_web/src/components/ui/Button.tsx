import React from 'react';
import { clsx } from 'clsx';

/**
 * ButtonVariant - Tipos de estilo visual para el botón.
 * @typedef {'primary' | 'secondary' | 'danger' | 'ghost' | 'glass'} ButtonVariant
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';

/**
 * ButtonSize - Tamaños disponibles para el botón.
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual del botón */
  variant?: ButtonVariant;
  /** Tamaño del botón */
  size?: ButtonSize;
  /** Clases adicionales de Tailwind */
  className?: string;
  /** Si está en estado de carga */
  loading?: boolean;
}

/**
 * Button
 * 
 * Componente de botón premium reutilizable. Soporta múltiples variantes,
 * estados de carga y efectos interactivos avanzados para ambos temas (Luz/Oscuro).
 * 
 * @param {ButtonProps} props - Propiedades del botón.
 * @returns {JSX.Element}
 */
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  loading,
  disabled,
  ...props 
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group relative overflow-hidden';
  
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/40 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm focus:ring-slate-300',
    danger: 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 focus:ring-red-400',
    ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60',
    glass: 'glass text-slate-800 dark:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-none border-white/40 dark:border-white/10',
  };

  return (
    <button 
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Cargando...</span>
        </div>
      ) : children}
      
      {/* Shine effect on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/20 group-hover:bg-white/40 transition-colors" />
    </button>
  );
}

export default Button;
