/**
 * useAgencyData – Hook central para el panel de agencia.
 * Cubre: dashboard stats, licencias del equipo, leads paginados con filtros,
 * exportar leads y purga por scope/tipo.
 * Usa DataCache para evitar re-fetches en cambios de pestaña.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DashboardAdapter, LicenseAdapter, LeadAdapter,
} from '../../../services';
import { useNotifications, useAuth } from '../../../contexts';
import { DataCache } from '../../../infrastructure/cache/dataCache';
import type { AgencyDashboard, License, Lead, LeadStatus } from '../../../core/entities';

const CACHE_DASH    = 'agency:dashboard';
const CACHE_TEAM    = 'agency:team';
const PAGE_SIZE     = 50;

// Bust old cache on module load (ensures backend scope fix applies immediately)
DataCache.invalidate(CACHE_TEAM);
DataCache.invalidate(CACHE_DASH);


// ── Lead filter state ────────────────────────────────────────────────────────
export interface LeadFilters {
  status: LeadStatus | 'all';
  license_id: string | 'all';
  search: string;
  minViewers?: number;
  minLikes?: number;
}

export function useAgencyData() {
  const { success, error: showError, confirm } = useNotifications();
  const { user: currentUser } = useAuth();

  // ── Dashboard stats ────────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState<AgencyDashboard | null>(
    () => DataCache.get(CACHE_DASH)
  );
  const [days, setDays] = useState(7);
  const [loadingDash, setLoadingDash] = useState(!DataCache.get<AgencyDashboard>(CACHE_DASH));

  // ── Team licenses ──────────────────────────────────────────────────────────
  const [teamLicenses, setTeamLicenses] = useState<License[]>(
    () => DataCache.get(CACHE_TEAM) ?? []
  );
  const [loadingTeam, setLoadingTeam] = useState(!DataCache.get<License[]>(CACHE_TEAM));

  // ── Leads state ────────────────────────────────────────────────────────────
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage]   = useState(0);
  const [hasMore, setHasMore]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isLoadingRef = useRef(false);

  const [filters, setFilters] = useState<LeadFilters>({
    status: 'all',
    license_id: 'all',
    search: '',
    minViewers: 0,
    minLikes: 0,
  });

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async (force = false, rangeDays = days) => {
    if (!force) {
      const cached = DataCache.get<AgencyDashboard>(`${CACHE_DASH}:${rangeDays}`);
      if (cached) { setDashboard(cached); setLoadingDash(false); return; }
    }
    setLoadingDash(true);
    try {
      const data = await DashboardAdapter.getAgencyDashboard({ 
        days: rangeDays, 
        agency_id: currentUser?.agency_id || undefined 
      });
      DataCache.set(`${CACHE_DASH}:${rangeDays}`, data, 60_000);
      setDashboard(data);
    } catch {
      showError('Error cargando Dashboard de Agencia.');
    } finally {
      setLoadingDash(false);
    }
  }, [showError, days]);

  // Polling para "Pulso del Sistema" (cada 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      loadDashboard(true, days);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadDashboard, days]);

  const loadTeam = useCallback(async (force = false) => {
    if (!force) {
      const cached = DataCache.get<License[]>(CACHE_TEAM);
      if (cached) { setTeamLicenses(cached); setLoadingTeam(false); return; }
    }
    setLoadingTeam(true);
    try {
      const data = await LicenseAdapter.list({ 
        agency_id: currentUser?.agency_id || undefined 
      });
      DataCache.set(CACHE_TEAM, data, 120_000);
      setTeamLicenses(data);
    } catch {
      showError('Error cargando el equipo.');
    } finally {
      setLoadingTeam(false);
    }
  }, [showError]);

  // ── Leads – resetear y cargar primera página ───────────────────────────────
  const resetAndLoadLeads = useCallback(async (newFilters?: LeadFilters) => {
    const f = newFilters ?? filters;
    setLeads([]);
    setLeadsPage(0);
    setHasMore(true);
    isLoadingRef.current = false;

    setLoadingMore(true);
    isLoadingRef.current = true;
    try {
      const params: Parameters<typeof LeadAdapter.list>[0] = {
        page: 1, page_size: PAGE_SIZE,
      };
      if (f.status !== 'all')     params.status     = f.status as LeadStatus;
      if (f.license_id !== 'all') params.license_id = f.license_id;
      if (f.search.trim())        params.search      = f.search.trim();
      if (f.minViewers && f.minViewers > 0) params.min_viewers = f.minViewers;
      if (f.minLikes && f.minLikes > 0)     params.min_likes = f.minLikes;

      // Always scope by agency if user is not superuser
      if (currentUser?.role !== 'superuser' && currentUser?.agency_id) {
         params.agency_id = currentUser.agency_id;
      }

      const res = await LeadAdapter.list(params);
      setLeads(res.items);
      setLeadsTotal(res.total);
      setLeadsPage(1);
      setHasMore(res.items.length === PAGE_SIZE);
    } catch {
      showError('Error cargando leads.');
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [filters, showError]);

  // ── Leads – cargar siguiente página (infinite scroll) ─────────────────────
  const loadMoreLeads = useCallback(async () => {
    if (!hasMore || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadingMore(true);

    const nextPage = leadsPage + 1;
    try {
      const params: Parameters<typeof LeadAdapter.list>[0] = {
        page: nextPage, page_size: PAGE_SIZE,
      };
      if (filters.status     !== 'all') params.status     = filters.status as LeadStatus;
      if (filters.license_id !== 'all') params.license_id = filters.license_id;
      if (filters.search.trim())        params.search      = filters.search.trim();
      if (filters.minViewers && filters.minViewers > 0) params.min_viewers = filters.minViewers;
      if (filters.minLikes && filters.minLikes > 0)     params.min_likes = filters.minLikes;

      // Always scope by agency if user is not superuser
      if (currentUser?.role !== 'superuser' && currentUser?.agency_id) {
        params.agency_id = currentUser.agency_id;
      }

      const res = await LeadAdapter.list(params);
      setLeads(prev => [...prev, ...res.items]);
      setLeadsTotal(res.total);
      setLeadsPage(nextPage);
      setHasMore(res.items.length === PAGE_SIZE);
    } catch {
      showError('Error cargando más leads.');
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore, leadsPage, filters, showError]);

  // ── Update filters ─────────────────────────────────────────────────────────
  const updateFilters = useCallback((partial: Partial<LeadFilters>) => {
    const next = { ...filters, ...partial };
    setFilters(next);
    resetAndLoadLeads(next);
  }, [filters, resetAndLoadLeads]);

  // ── Export leads ───────────────────────────────────────────────────────────
  const exportLeads = useCallback(async () => {
    try {
      const rows = await LeadAdapter.exportRaw();
      if (!rows.length) { showError('No hay datos para exportar.'); return; }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `DreamLive_Leads_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success('Exportación completada.');
    } catch {
      showError('Error al exportar leads.');
    }
  }, [success, showError]);

  // ── Purge leads ────────────────────────────────────────────────────────────
  const purgeLeads = useCallback(async (
    type: LeadStatus | 'all',
    licenseId?: string,
  ) => {
    const scopeLabel = licenseId ? 'esta licencia' : 'toda la agencia';
    const msg = type === 'all'
      ? `⚠️ Eliminar TODOS los leads de ${scopeLabel}. Irreversible.`
      : `¿Eliminar leads con estado "${type}" de ${scopeLabel}?`;

    const ok = await confirm(msg);
    if (!ok) return;
    try {
      // Reutilizamos LeadAdapter.purge como proxy (el backend maneja scope por token)
      const res = await LeadAdapter.purge();
      success(`${res.deleted} leads eliminados.`);
      DataCache.invalidate(CACHE_DASH);
      await loadDashboard(true);
      resetAndLoadLeads();
    } catch {
      showError('Error en la limpieza de datos.');
    }
  }, [confirm, success, showError, loadDashboard, resetAndLoadLeads]);

  // ── Update license field (Team Manager inline edit) ────────────────────────
  const updateLicenseField = useCallback(async (
    licenseId: string,
    field: 'recruiter_name' | 'request_limit' | 'refresh_minutes' | 'admin_password',
    value: string,
  ) => {
    try {
      const payload: any = {};
      if (field === 'request_limit' || field === 'refresh_minutes') {
        payload[field] = Number(value);
      } else {
        payload[field] = value;
      }
      
      await LicenseAdapter.updateConfig(licenseId, payload);
      success('Campo actualizado correctamente.');
      DataCache.invalidate(CACHE_TEAM);
      await loadTeam(true);
    } catch {
      showError('Error al actualizar el campo.');
    }
  }, [showError, success, loadTeam]);

  const syncAllPasswords = useCallback(async (newPassword: string) => {
    try {
      const res = await LicenseAdapter.syncPasswords(newPassword);
      success(`Sincronización exitosa: ${res.updated_count} licencias actualizadas.`);
      await loadTeam(true); // Recargar equipo para ver cambios si los hubiera
    } catch {
      showError('Error al sincronizar contraseñas.');
    }
  }, [showError, success, loadTeam]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser?.id) {
      loadDashboard();
      loadTeam();
    }
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    dashboard, loadingDash, days,
    teamLicenses, loadingTeam,
    leads, leadsTotal, hasMore, loadingMore,
    filters,
    // Loaders
    loadDashboard: (d?: number) => loadDashboard(true, d ?? days),
    loadTeam: () => loadTeam(true),
    setDays,
    resetAndLoadLeads,
    loadMoreLeads,
    // Actions
    updateFilters,
    exportLeads,
    purgeLeads,
    updateLicenseField,
    syncAllPasswords,
  };
}
