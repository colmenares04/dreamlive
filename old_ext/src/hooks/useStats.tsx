import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";
import { browser } from "wxt/browser";

export function useStats() {
  const [stats, setStats] = useState({
    pendientes: 0,
    disponibles: 0,
    enviados12h: 0,
    contactadosTotal: 0,
    limitEnviados: 60,
  });

  const fetchStatsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = async () => {
    const license = await licenseService.getStoredLicense();
    const licenseId = (license as any)?.id;
    const licenseKey = (license as any)?.key;

    if (!licenseId) return;

    try {
      // 1. Obtener Configuración en Tiempo Real (Límites y Tiempo)
      // Casteamos a 'any' para leer las nuevas columnas sin errores de TS
      const { data: configData } = await (supabase
        .from("licenses")
        .select("limit_requests, refresh_minutes")
        .eq("license_key", licenseKey)
        .single() as any);

      const dynamicLimit = configData?.limit_requests || 60;
      const refreshMinutes = configData?.refresh_minutes || 720; // Default 12h (720m)

      // 2. Calcular la ventana de tiempo dinámica
      const timeWindow = new Date(
        Date.now() - refreshMinutes * 60 * 1000,
      ).toISOString();

      // 3. Conteo de Pendientes
      const { count: pendientes } = await supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", licenseId)
        .eq("status", "recopilado");

      // 4. Conteo de Disponibles
      const { count: disponibles } = await supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", licenseId)
        .eq("status", "disponible");

      // 5. Conteo de Enviados (En la ventana dinámica)
      const { count: enviadosWindow } = await supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", licenseId)
        .eq("status", "contactado")
        .gte("contacted_at", timeWindow);

      // 6. Conteo Total Histórico
      const { count: total } = await supabase
        .from("tiktok_leads")
        .select("*", { count: "exact", head: true })
        .eq("license_id", licenseId)
        .eq("status", "contactado");

      setStats({
        pendientes: pendientes || 0,
        disponibles: disponibles || 0,
        enviados12h: enviadosWindow || 0,
        contactadosTotal: total || 0,
        limitEnviados: dynamicLimit,
      });
    } catch (e) {
      console.error("Error en fetchStats:", e);
    }
  };

  // Debounced fetch for periodic DB validation (not for instant updates)
  const debouncedFetchStats = useCallback(() => {
    // Periodic DB validation - refresh every 5 seconds to correct any drift
    if (fetchStatsTimeoutRef.current) {
      clearTimeout(fetchStatsTimeoutRef.current);
    }
    fetchStatsTimeoutRef.current = setTimeout(() => {
      fetchStats();
      fetchStatsTimeoutRef.current = null;
    }, 5000); // 5 seconds - only for validation, local updates are instant
  }, []);

  const pendingCountRef = useRef(0); // Track pending increments for 5-lead batching

  useEffect(() => {
    fetchStats(); // Initial fetch

    const messageListener = (message: any) => {
      // Batch increment - update every 5 leads for smooth performance
      if (message.type === "LEAD_SAVED_CONFIRMATION") {
        pendingCountRef.current += 1;

        // Update UI every 5 leads to reduce re-renders
        if (pendingCountRef.current >= 5) {
          setStats((prev) => ({
            ...prev,
            pendientes: prev.pendientes + pendingCountRef.current,
          }));
          pendingCountRef.current = 0;
        }

        // Trigger periodic DB validation
        debouncedFetchStats();
      }

      // Immediate DB sync for critical events
      if (
        message.type === "BATCH_PROCESSED" ||
        message.type === "ROTATE_KEYWORD" ||
        message.type === "LEAD_CONTACTED_SUCCESS" ||
        message.type === "CONFIG_UPDATED" ||
        message.type === "COLLECTION_STOPPED"
      ) {
        // Flush any pending increments first
        if (pendingCountRef.current > 0) {
          setStats((prev) => ({
            ...prev,
            pendientes: prev.pendientes + pendingCountRef.current,
          }));
          pendingCountRef.current = 0;
        }

        // Clear any pending debounced fetch
        if (fetchStatsTimeoutRef.current) {
          clearTimeout(fetchStatsTimeoutRef.current);
          fetchStatsTimeoutRef.current = null;
        }
        fetchStats(); // Fetch immediately to validate and correct local count
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
      if (fetchStatsTimeoutRef.current) {
        clearTimeout(fetchStatsTimeoutRef.current);
      }
    };
  }, [debouncedFetchStats]);

  return { ...stats, refreshStats: fetchStats };
}
