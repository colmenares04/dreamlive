import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Contenido de la tarjeta */
  children: React.ReactNode;
  /** Clases adicionales de Tailwind */
  className?: string;
  /** Si debe tener efecto Glassmorphism */
  glass?: boolean;
  /** Si debe tener animación de entrada */
  animate?: boolean;
}

/**
 * Card
 * 
 * Contenedor premium para tarjetas y paneles. Soporta efectos de elevación,
 * glassmorphism y animaciones de entrada.
 * 
 * @param {CardProps} props - Propiedades de la tarjeta.
 * @returns {JSX.Element}
 */
export function Card({ children, className = '', glass = false, animate = true, ...props }: CardProps) {
  return (
    <div 
      className={clsx(
        glass ? 'glass-card' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm',
        'rounded-3xl p-6 transition-all duration-300',
        animate && 'animate-fade-in',
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
