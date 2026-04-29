/**
 * useAdminData – Hook central del panel de administración.
 * Maneja estado + cache para: overview, licencias, agencias y versiones.
 * TTL de cache: 60s overview, 120s deps.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  OverviewAdapter, LicenseAdapter, AgencyAdapter,
  VersionAdapter, LeadAdapter,
} from '../../../services';
import { useNotifications, useAuth } from '../../../contexts';
import { DataCache } from '../../../infrastructure/cache/dataCache';
import type { AdminOverview, License, Agency, AppVersion } from '../../../core/entities';

const CACHE_OVERVIEW = 'admin:overview';
const CACHE_LICENSES = 'admin:licenses';
const CACHE_AGENCIES = 'admin:agencies';
const CACHE_VERSIONS = 'admin:versions';

export function useAdminData() {
  const { success, error: showError, confirm } = useNotifications();
  const { user, role } = useAuth();

  const [overview, setOverview]     = useState<AdminOverview | null>(() => DataCache.get(CACHE_OVERVIEW));
  const [licenses, setLicenses]     = useState<License[]>(() => DataCache.get(CACHE_LICENSES) ?? []);
  const [agencies, setAgencies]     = useState<Agency[]>(() => DataCache.get(CACHE_AGENCIES) ?? []);
  const [versions, setVersions]     = useState<AppVersion[]>(() => DataCache.get(CACHE_VERSIONS) ?? []);
  const [metrics, setMetrics]       = useState<Record<string, { today: number; total: number; last_ping: string | null }>>({});
  const [days, setDays]             = useState(7);

  const [loadingOverview, setLoadingOverview] = useState(!DataCache.get(CACHE_OVERVIEW));
  const [loadingDeps,     setLoadingDeps]     = useState(!DataCache.get(CACHE_LICENSES));

  // ── Overview ──────────────────────────────────────────────────────────────
  const loadOverview = useCallback(async (force = false, rangeDays = days) => {
    if (role !== 'superuser') {
      setLoadingOverview(false);
      return;
    }
    
    if (!force) {
      const cached = DataCache.get<AdminOverview>(`${CACHE_OVERVIEW}:${rangeDays}`);
      if (cached) { setOverview(cached); setLoadingOverview(false); return; }
    }
    setLoadingOverview(true);
    try {
      const data = await OverviewAdapter.getAdminOverview({ days: rangeDays });
      DataCache.set(`${CACHE_OVERVIEW}:${rangeDays}`, data, 60_000);
      setOverview(data);
    } catch {
      showError('No se pudo cargar la vista general.');
    } finally {
      setLoadingOverview(false);
    }
  }, [showError, days, role]);

  // ── Metrics ──────────────────────────────────────────────────────────────
  const loadMetrics = useCallback(async (agencyId?: string) => {
    // If not superuser, force their agency
    const effectiveAgencyId = role === 'superuser' ? agencyId : (user?.agency_id || undefined);
    
    try {
      const data = await LicenseAdapter.getMetrics(effectiveAgencyId);
      setMetrics(data);
    } catch (err) {
      console.warn("Failed to load license metrics", err);
      showError('Error al cargar métricas de licencias.');
      setMetrics({}); 
    }
  }, [showError, role, user?.agency_id]);

  // Polling para "Pulso del Sistema" (cada 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      loadOverview(true, days);
      loadMetrics();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadOverview, loadMetrics, days]);

  // ── Dependencias (licencias / agencias / versiones) ───────────────────────
  const loadDeps = useCallback(async (force = false, agencyId?: string) => {
    const effectiveAgencyId = role === 'superuser' ? agencyId : (user?.agency_id || undefined);

    if (!force) {
      const cl = DataCache.get<License[]>(`${CACHE_LICENSES}:${effectiveAgencyId || 'all'}`);
      const ca = DataCache.get<Agency[]>(CACHE_AGENCIES);
      const cv = DataCache.get<AppVersion[]>(CACHE_VERSIONS);
      if (cl && ca && (role !== 'superuser' || cv)) {
        setLicenses(cl); setAgencies(ca); 
        if (cv) setVersions(cv);
        setLoadingDeps(false); return;
      }
    }
    setLoadingDeps(true);
    try {
      const tasks: any[] = [
        LicenseAdapter.list({ agency_id: effectiveAgencyId }),
        AgencyAdapter.list(),
      ];
      
      // Only superusers need versions
      if (role === 'superuser') {
        tasks.push(VersionAdapter.list());
      }

      const results = await Promise.all(tasks);
      const l = results[0];
      const a = results[1];
      const v = role === 'superuser' ? results[2] : [];

      DataCache.set(`${CACHE_LICENSES}:${effectiveAgencyId || 'all'}`, l, 120_000);
      DataCache.set(CACHE_AGENCIES, a, 120_000);
      if (role === 'superuser') DataCache.set(CACHE_VERSIONS, v, 120_000);
      
      setLicenses(l); setAgencies(a); setVersions(v);
    } catch (err) {
      console.error('Error loading administrative dependencies:', err);
      showError('Error al cargar dependencias (licencias/agencias).');
      setLicenses([]); 
    } finally {
      setLoadingDeps(false);
    }
  }, [showError, role, user?.agency_id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const createLicense = useCallback(async (payload: {
    agency_id: string; recruiter_name: string; days: number;
    request_limit?: number; refresh_minutes?: number;
  }) => {
    try {
      await LicenseAdapter.create(payload);
      success('Licencia creada correctamente.');
      DataCache.invalidate(CACHE_LICENSES);
      DataCache.invalidate(CACHE_OVERVIEW);
      await loadDeps(true);
      await loadOverview(true);
    } catch {
      showError('Error al crear la licencia.');
    }
  }, [success, showError, loadDeps, loadOverview]);

  const extendLicense = useCallback(async (licenseId: string, days = 30) => {
    const ok = await confirm(`¿Añadir ${days} días a esta licencia?`);
    if (!ok) return;
    try {
      await LicenseAdapter.extend(licenseId, days);
      success(`+${days} días añadidos.`);
      DataCache.invalidate(CACHE_LICENSES);
      await loadDeps(true);
    } catch {
      showError('Error al extender la licencia.');
    }
  }, [confirm, success, showError, loadDeps]);

  const toggleLicense = useCallback(async (licenseId: string) => {
    try {
      await LicenseAdapter.toggle(licenseId);
      DataCache.invalidate(CACHE_LICENSES);
      await loadDeps(true);
    } catch {
      showError('Error al cambiar estado de la licencia.');
    }
  }, [showError, loadDeps]);

  const createAgency = useCallback(async (name: string) => {
    try {
      await AgencyAdapter.create({ name, code: name.toUpperCase().slice(0, 6) });
      success('Agencia creada.');
      DataCache.invalidate(CACHE_AGENCIES);
      await loadDeps(true);
    } catch {
      showError('Error al crear la agencia.');
    }
  }, [success, showError, loadDeps]);

  const deleteAgency = useCallback(async (agencyId: string, password: string) => {
    try {
      await AgencyAdapter.remove(agencyId, password);
      success('Agencia eliminada permanentemente.');
      DataCache.invalidate(CACHE_AGENCIES);
      DataCache.invalidate(CACHE_LICENSES);
      DataCache.invalidate(CACHE_OVERVIEW);
      await loadDeps(true);
      await loadOverview(true);
    } catch (err: any) {
      showError(err.response?.data?.detail ?? 'Error al eliminar la agencia.');
    }
  }, [success, showError, loadDeps, loadOverview]);

  const purgePendingLeads = useCallback(async () => {
    if (!overview?.pending_collected) {
      showError('No hay usuarios pendientes para purgar.');
      return;
    }
    const ok = await confirm(
      `¿Eliminar ${overview.pending_collected} leads recopilados pendientes? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      const res = await LeadAdapter.purge();
      success(`${res.deleted} leads eliminados.`);
      DataCache.invalidate(CACHE_OVERVIEW);
      await loadOverview(true);
    } catch {
      showError('Error en la purga.');
    }
  }, [overview, confirm, success, showError, loadOverview]);

  const publishVersion = useCallback(async (payload: {
    version_number: string; changelog: string; tags: string[];
    windows_url: string; windows_size_kb: number;
    macos_url: string; macos_size_kb: number;
  }) => {
    try {
      const res = await VersionAdapter.publish(payload);
      success(`Versión ${res.version} publicada (${res.published} builds).`);
      DataCache.invalidate(CACHE_VERSIONS);
      await loadDeps(true);
    } catch {
      showError('Error al publicar la versión.');
    }
  }, [success, showError, loadDeps]);

  const activateVersion = useCallback(async (versionId: string) => {
    const ok = await confirm('¿Activar esta versión?');
    if (!ok) return;
    try {
      await VersionAdapter.activate(versionId);
      success('Versión activada.');
      DataCache.invalidate(CACHE_VERSIONS);
      await loadDeps(true);
    } catch {
      showError('Error al activar la versión.');
    }
  }, [confirm, success, showError, loadDeps]);

  const deleteVersion = useCallback(async (versionId: string) => {
    const ok = await confirm('¿Eliminar esta versión del servidor?');
    if (!ok) return;
    try {
      await VersionAdapter.remove(versionId);
      success('Versión eliminada.');
      DataCache.invalidate(CACHE_VERSIONS);
      await loadDeps(true);
    } catch {
      showError('Error al eliminar la versión.');
    }
  }, [confirm, success, showError, loadDeps]);

  const deleteLicense = useCallback(async (licenseId: string, password?: string) => {
    if (!password) {
      showError('Se requiere contraseña administrativa.');
      return;
    }
    try {
      // Usamos el AgencyAdapter.remove logic como referencia para validación de pass si fuera necesario, 
      // pero aquí LicenseAdapter.remove no recibe password en el body actualmente en el backend.
      // Así que simplemente validamos que la haya ingresado en el UI (el backend ya protege con require_admin).
      await LicenseAdapter.remove(licenseId);
      success('Licencia eliminada.');
      DataCache.invalidate(CACHE_LICENSES);
      await loadDeps(true);
    } catch {
      showError('Error al eliminar la licencia.');
    }
  }, [success, showError, loadDeps]);

  const updateLicenseDate = useCallback(async (licenseId: string, newDate: string) => {
    try {
      await LicenseAdapter.updateDate(licenseId, newDate);
      success('Fecha de vencimiento actualizada.');
      DataCache.invalidate(CACHE_LICENSES);
      await loadDeps(true);
    } catch {
      showError('Error al actualizar la fecha.');
    }
  }, [success, showError, loadDeps]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      loadOverview();
      loadDeps();
      loadMetrics();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge metrics into licenses for the view
  const licensesWithMetrics = licenses.map(l => ({
    ...l,
    today_leads: metrics[l.id]?.today || 0,
    total_leads: metrics[l.id]?.total || 0,
    last_ping: metrics[l.id]?.last_ping
  }));

  return {
    // State
    overview, licenses: licensesWithMetrics, agencies, versions, days, metrics,
    loadingOverview, loadingDeps,
    // Reload
    loadOverview: (d?: number) => loadOverview(true, d ?? days),
    loadDeps: (aid?: string) => loadDeps(true, aid),
    loadMetrics: (aid?: string) => loadMetrics(aid),
    // Setters
    setDays,
    // Actions
    purgePendingLeads,
    createLicense,
    extendLicense,
    toggleLicense,
    deleteLicense,
    updateLicenseDate,
    createAgency,
    deleteAgency,
    publishVersion,
    activateVersion,
    deleteVersion,
  };
}
