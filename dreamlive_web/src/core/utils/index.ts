/**
 * Utilidades generales de la aplicación.
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Fechas ────────────────────────────────────────────────────────────────────
export function formatDate(iso: string | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), pattern, { locale: es });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatDate(iso, 'dd/MM/yyyy HH:mm');
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

// ── Números ───────────────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('es');
}

export function formatFileSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
  return `${kb} KB`;
}

// ── Strings ───────────────────────────────────────────────────────────────────
export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.substring(0, max) + '…';
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function maskLicenseKey(key: string): string {
  if (key.length <= 8) return key;
  return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
}

// ── Colores de estado ─────────────────────────────────────────────────────────
export function statusColor(status: string): 'green' | 'blue' | 'yellow' | 'red' | 'gray' {
  const map: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
    active: 'green',
    disponible: 'green',
    contactado: 'blue',
    recopilado: 'yellow',
    inactive: 'red',
    expired: 'red',
    pending: 'yellow',
  };
  return map[status] ?? 'gray';
}

// ── Excel export ──────────────────────────────────────────────────────────────
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Datos'
): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// ── Clipboard ────────────────────────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
