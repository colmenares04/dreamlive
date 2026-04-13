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

  const accentColor = variant === 'admin' ? 'text-sky-400' : 'text-indigo-400';
  const activeBg = variant === 'admin' ? 'bg-sky-500/10 text-sky-400' : 'bg-indigo-500 text-white';

  const content = (
    <aside className="w-64 bg-slate-950 flex flex-col h-screen fixed top-0 left-0 z-50 border-r border-slate-800/60">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            variant === 'admin' ? 'bg-sky-500' : 'bg-indigo-500'
          )}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-tight leading-none">{title}</p>
            {subtitle && <p className="text-slate-500 text-[10px] font-medium tracking-widest uppercase mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              activeId === item.id
                ? activeBg
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )}
          >
            <span className="w-4 h-4 shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                activeId === item.id ? 'bg-white/20' : 'bg-slate-700 text-slate-300'
              )}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-4 border-t border-slate-800/60">{footer}</div>
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
      'bg-white rounded-xl p-5 border border-slate-200 shadow-sm',
      accentColor && `border-l-4 border-l-[${accentColor}]`
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        {icon && (
          <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', iconBgClass ?? 'bg-slate-100')}>
            {icon}
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
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  gray: 'bg-slate-100 text-slate-500 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
      badgeClasses[variant]
    )}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════════════════
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widthClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto',
        widthClass
      )}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
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
}

export function DataTable<T>({ columns, data, loading, emptyMessage = 'Sin datos', keyExtractor }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                  Cargando...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={keyExtractor(row)} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={clsx('px-4 py-3 text-slate-700 align-middle', col.className)}>
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
  title: string; children: React.ReactNode; defaultOpen?: boolean;
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
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
type ButtonVariant = 'primary' | 'danger' | 'success' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md';

const btnBase = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all cursor-pointer border disabled:opacity-50';
const btnVariants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-700',
  danger: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  ghost: 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100',
  outline: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
};
const btnSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  children, variant = 'outline', size = 'md',
  loading, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: ButtonSize; loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={clsx(btnBase, btnVariants[variant], btnSizes[size], className)}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  );
}
