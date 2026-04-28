import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface ModalProps {
  /** Indica si el modal está abierto */
  isOpen: boolean;
  /** Función para cerrar el modal */
  onClose: () => void;
  /** Título del modal */
  title?: string;
  /** Contenido del modal */
  children?: React.ReactNode;
  /** Botones o contenido del pie de página */
  footer?: React.ReactNode;
  /** Clases adicionales de Tailwind para personalizar el contenedor */
  className?: string;
  /** Tamaño máximo del modal (clase Tailwind) */
  maxWidth?: string;
}

/**
 * Modal
 * 
 * Componente de ventana modal premium con efectos de desenfoque de fondo,
 * animaciones de escala y soporte para temas. Soporta modo oscuro y 
 * glassmorphism por defecto.
 * 
 * @param {ModalProps} props - Propiedades del modal.
 * @returns {JSX.Element | null}
 */
export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  className = '', 
  maxWidth = 'max-w-md' 
}: ModalProps) {
  // Manejo de scroll y escape
  useEffect(() => {
    if (!isOpen) return;
    
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop with premium blur */}
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={clsx(
        "relative w-full glass-card rounded-[2.5rem] overflow-hidden animate-scale-in flex flex-col max-h-[90vh]",
        maxWidth,
        className
      )}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
