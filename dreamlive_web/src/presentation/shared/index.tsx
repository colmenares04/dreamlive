/**
 * Componentes UI reutilizables – Design System de DreamLive.
 */
import React, { useState } from 'react';
import { clsx } from 'clsx';

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════
export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface SidebarProps {
  title: string;
  subtitle?: string;
  items: SidebarItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  footer?: React.ReactNode;
  variant?: 'admin' | 'panel';
}

export function Sidebar({
  title, subtitle, items, activeId, onNavigate, footer, variant = 'admin'
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin uses violet/purple theme, panel uses blue theme
  const isAdmin = variant === 'admin';
  const activeBg = isAdmin 
    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/10 text-violet-400 border-l-2 border-violet-500' 
    : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/10 text-blue-400 border-l-2 border-blue-500';
  const accentGradient = isAdmin
    ? 'from-violet-500 to-purple-600'
    : 'from-blue-500 to-cyan-400';
  const subtitleColor = isAdmin ? 'text-violet-400/60' : 'text-blue-400/60';

  const content = (
    <aside className={clsx(
      "w-64 flex flex-col h-screen fixed top-0 left-0 z-50",
      isAdmin ? "bg-slate-950 border-r border-violet-500/10" : "bg-card border-r border-border"
    )}>
      {/* Background Effects for Admin */}
      {isAdmin && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-violet-500/5 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-purple-500/5 to-transparent" />
        </div>
      )}

      {/* Brand */}
      <div className={clsx(
        "relative px-6 py-5 border-b",
        isAdmin ? "border-violet-500/10" : "border-slate-800/60"
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg',
            accentGradient,
            isAdmin ? 'shadow-violet-500/25' : 'shadow-blue-500/25'
          )}>
            {isAdmin ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-white font-black text-base tracking-tight leading-none">{title}</p>
            {subtitle && <p className={clsx("text-[10px] font-bold tracking-[0.2em] uppercase mt-1", subtitleColor)}>{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              activeId === item.id
                ? activeBg
                : clsx(
                    'text-slate-500 dark:text-slate-400 hover:text-foreground',
                    isAdmin ? 'hover:bg-violet-500/10' : 'hover:bg-accent'
                  )
            )}
          >
            <span className="w-4 h-4 shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                activeId === item.id 
                  ? (isAdmin ? 'bg-violet-500/30' : 'bg-blue-500/30 text-blue-400') 
                  : 'bg-muted text-muted-foreground font-black'
              )}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className={clsx(
          "relative px-4 py-4 border-t",
          isAdmin ? "border-violet-500/10" : "border-slate-800/60"
        )}>
          {footer}
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-[60] w-9 h-9 bg-slate-900 border border-slate-700
          rounded-lg flex items-center justify-center text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop */}
      <div className="hidden md:block">{content}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed inset-y-0 left-0 z-50">{content}</div>
        </>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  iconBgClass?: string;
}

export function StatCard({ label, value, subtext, icon, accentColor, iconBgClass }: StatCardProps) {
  return (
    <div className={clsx(
      'bg-card rounded-xl p-5 border border-border shadow-sm transition-all hover:shadow-md',
      accentColor && `border-l-4`
    )} style={accentColor ? { borderLeftColor: accentColor } : {}}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-2">{label}</p>
          <p className="text-3xl font-black text-foreground leading-none tracking-tighter">{value}</p>
          {subtext && <p className="text-[11px] font-medium text-muted-foreground/80 mt-2">{subtext}</p>}
        </div>
        {icon && (
          <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shadow-inner', iconBgClass ?? 'bg-muted')}>
            <span className="scale-110">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════════════════
type BadgeVariant = 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'indigo';

const badgeClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  yellow: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  gray: 'bg-secondary text-secondary-foreground border-border',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
};

export function Badge({ children, variant = 'gray', className }: { children: React.ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
      badgeClasses[variant],
      className
    )}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════��══════════════════════════════════
import ReactDom from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showHeader?: boolean;
}

export function Modal({ 
  open, onClose, title, children, size = 'md', showHeader = true 
}: ModalProps) {
  if (!open) return null;
  
  const widthClass = { 
    sm: 'max-w-sm', 
    md: 'max-w-lg', 
    lg: 'max-w-2xl', 
    xl: 'max-w-5xl',
    full: 'max-w-7xl'
  }[size];

  // El Modal se "teletransporta" al body para evitar que contenedores padres con overflow lo corten
  return ReactDom.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden">
      {/* Overlay con Blur de Alta Gama */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[6px] transition-all duration-500 animate-in fade-in" 
        onClick={onClose} 
      />
      
      {/* Contenedor del Modal */}
      <div className={clsx(
        'relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] w-full max-h-[92vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300 flex flex-col',
        widthClass
      )}>
        {/* Header Premium */}
        {showHeader && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shrink-0">
            <h3 className="font-black text-foreground text-2xl tracking-tighter uppercase">{title}</h3>
            <button 
              onClick={onClose} 
              className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-all active:scale-90 border border-transparent hover:border-rose-500/20"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA TABLE
// ═══════════════════════════════════════════════════════════════════════════════
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string | number;
  variant?: string;
}

export function DataTable<T>({ columns, data, loading, emptyMessage = 'Sin datos', keyExtractor }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                  Cargando...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground text-sm font-medium italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={keyExtractor(row)} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={clsx('px-4 py-4 text-foreground/90 align-middle', col.className)}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════════════════════════
export function Collapsible({ title, children, defaultOpen = false }: {
  title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span>{title}</span>
        <svg className={clsx('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE HEADER
// ═══════════════════════════════════════════════════════════════════════════════
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
      <div>
        <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">{title}</h2>
        {subtitle && <p className="text-muted-foreground font-medium text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
type ButtonVariant = 'primary' | 'danger' | 'success' | 'ghost' | 'outline' | 'indigo';
type ButtonSize = 'sm' | 'md';

const btnBase = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all cursor-pointer border disabled:opacity-50 justify-center';
const btnVariants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-700',
  danger: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  ghost: 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100',
  outline: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
  indigo: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20',
};
const btnSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  children, variant = 'outline', size = 'md',
  loading, full, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; full?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={clsx(
        btnBase, 
        btnVariants[variant], 
        btnSizes[size], 
        full && 'w-full',
        className
      )}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════════════════════════════════
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      'bg-card rounded-xl border border-border shadow-sm overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}
