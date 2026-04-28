import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";

// 1. Interfaz del objeto que guardamos en la extensión
export interface LicenseInfo {
  id: string;
  key: string;
  isActive: boolean;
  expirationDate: string | null;
  agencyName: string;
  recruiterName: string;
  limitRequests: number;
  refreshMinutes: number;
  maxDevices: number;
}

// 2. Interfaz de lo que responde Supabase (Reflejando el cambio de BD)
interface LicenseQueryResponse {
  id: string;
  license_key: string;
  is_active: boolean;
  expiration_date: string | null;
  recruiter_name: string;
  limit_requests: number;
  refresh_minutes: number;
  agencies: {
    name: string;
  } | null;
  max_devices: number;
}

export const licenseService = {
  async verifyLicense(
    key: string,
  ): Promise<{ success: boolean; data?: LicenseInfo; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("licenses")
        .select(
          `
          id, 
          license_key,
          is_active,
          expiration_date,
          recruiter_name,
          limit_requests,
          refresh_minutes,
          max_devices,
          agencies ( name )
        `,
        )
        .eq("license_key", key)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { success: false, error: "La licencia no existe." };
      }

      const licenseData = data as unknown as LicenseQueryResponse;

      if (!licenseData.is_active) {
        return {
          success: false,
          error: "Esta licencia ha sido desactivada por el administrador.",
        };
      }

      if (
        licenseData.expiration_date &&
        new Date(licenseData.expiration_date) < new Date()
      ) {
        return { success: false, error: "La licencia ha expirado." };
      }

      // 3. MAPEO ACTUALIZADO
      const licenseInfo: LicenseInfo = {
        id: licenseData.id,
        key: licenseData.license_key,
        isActive: licenseData.is_active,
        expirationDate: licenseData.expiration_date,
        // Nombre de agencia desde el join
        agencyName: licenseData.agencies?.name || "Agencia Desconocida",
        // Datos específicos del reclutador y límites desde la licencia
        recruiterName: licenseData.recruiter_name || "Agente DreamLive",
        limitRequests: licenseData.limit_requests || 60,
        refreshMinutes: licenseData.refresh_minutes || 720,
        maxDevices: licenseData.max_devices || 1,
      };

      // await browser.storage.local.set({ savedLicense: licenseInfo }); <--- MOVIDO

      // 5. Registrar sesión inmediatamente (Heartbeat)
      try {
        const { getDeviceMetadata } = await import("@/utils/security");
        const {
          deviceId,
          browser: browserName,
          os,
          ipAddress,
        } = await getDeviceMetadata();

        // A. Obtener sesiones actuales para controlar límite
        const { data: currentSessions } = await supabase
          .from("license_sessions")
          .select("id, device_id, last_ping")
          .eq("license_id", licenseData.id)
          .order("last_ping", { ascending: true }); // Más antiguos primero

        const sessions = currentSessions || [];
        const isCurrentDeviceRegistered = sessions.some(
          (s: any) => s.device_id === deviceId,
        );
        const maxDev = licenseData.max_devices || 1;

        // B. Si es un dispositivo nuevo y estamos llenos, borrar los viejos (Rotación)
        // REVERTIDO A ROTACIÓN POR PETICIÓN DEL USUARIO
        if (!isCurrentDeviceRegistered && sessions.length >= maxDev) {
          const toDeleteCount = sessions.length - maxDev + 1;
          const sessionsToDelete = sessions.slice(0, toDeleteCount);

          if (sessionsToDelete.length > 0) {
            console.log(
              "🚫 Límite alcanzado. Rotando sesión (Eliminando antigua):",
              sessionsToDelete,
            );
            await supabase
              .from("license_sessions")
              .delete()
              .in(
                "id",
                sessionsToDelete.map((s: any) => s.id),
              );
          }
        }

        // @ts-ignore: Supabase typing fix
        await supabase.from("license_sessions").upsert(
          {
            license_id: licenseInfo.id,
            device_id: deviceId,
            browser: browserName,
            os: os,
            ip_address: ipAddress,
            last_ping: new Date().toISOString(),
          } as any,
          { onConflict: "device_id" },
        );
      } catch (pingErr) {
        console.warn("No se pudo registrar la sesión inicial (ping):", pingErr);
        // Fallamos si no podemos registrar la sesión para evitar inconsistencies
        return {
          success: false,
          error: "Error al registrar sesión en servidor.",
        };
      }

      // 6. AHORA SÍ: Guardamos la licencia localmente.
      // Esto disparará el evento 'storage' en useAppController -> validateLicense -> performHeartbeat.
      // Como ya hicimos el upsert arriba, el heartbeat encontrará la sesión y NO bloqueará.
      await browser.storage.local.set({ savedLicense: licenseInfo });

      return { success: true, data: licenseInfo };
    } catch (err: any) {
      console.error("Error verificando licencia:", err);
      return {
        success: false,
        error: "Error de conexión con el servidor: " + err.message,
      };
    }
  },

  async getStoredLicense(): Promise<LicenseInfo | null> {
    const res = await browser.storage.local.get("savedLicense");
    if (res && res.savedLicense) {
      return res.savedLicense as LicenseInfo;
    }
    return null;
  },

  async removeLicense() {
    await browser.storage.local.remove("savedLicense");
  },

  async getConnectedDevices(licenseId: string) {
    const { data, error } = await supabase
      .from("license_sessions")
      .select("*")
      .eq("license_id", licenseId)
      .order("last_ping", { ascending: false });

    if (error) {
      console.error("Error fetching devices:", error);
      return [];
    }
    return data;
  },

  /**
   * Validates the license in real-time before critical actions
   * This prevents usage if the license has been deactivated or expired
   */
  async validateLicenseBeforeAction(): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      console.log("🔍 [LICENSE] Validating license before action...");

      // Get stored license
      const storedLicense = await this.getStoredLicense();
      if (!storedLicense) {
        console.warn("❌ [LICENSE] No stored license found");
        return { isValid: false, error: "No hay licencia activa." };
      }

      console.log("📋 [LICENSE] Checking license ID:", storedLicense.id);

      // Fetch fresh data from Supabase
      const { data, error } = await supabase
        .from("licenses")
        .select(
          `
          id, 
          license_key,
          is_active,
          expiration_date,
          recruiter_name,
          limit_requests,
          refresh_minutes,
          max_devices,
          agencies ( name )
        `,
        )
        .eq("id", storedLicense.id)
        .maybeSingle();

      if (error) {
        console.error("❌ [LICENSE] Error validating license:", error);
        return {
          isValid: false,
          error: "Error al verificar la licencia con el servidor.",
        };
      }

      if (!data) {
        // License was deleted
        console.warn("❌ [LICENSE] License deleted from database");
        await this.removeLicense();
        return { isValid: false, error: "La licencia no existe." };
      }

      const licenseData = data as unknown as LicenseQueryResponse;

      console.log(
        "📊 [LICENSE] Database status - is_active:",
        licenseData.is_active,
      );

      // Check if license is active
      if (!licenseData.is_active) {
        console.warn("❌ [LICENSE] License is INACTIVE");
        await this.removeLicense();
        return {
          isValid: false,
          error: "Esta licencia ha sido desactivada por el administrador.",
        };
      }

      // Check expiration
      if (
        licenseData.expiration_date &&
        new Date(licenseData.expiration_date) < new Date()
      ) {
        console.warn("❌ [LICENSE] License EXPIRED");
        await this.removeLicense();
        return { isValid: false, error: "La licencia ha expirado." };
      }

      console.log("✅ [LICENSE] License is VALID");

      // Update local storage with fresh data
      const updatedLicenseInfo: LicenseInfo = {
        id: licenseData.id,
        key: licenseData.license_key,
        isActive: licenseData.is_active,
        expirationDate: licenseData.expiration_date,
        agencyName: licenseData.agencies?.name || "Agencia Desconocida",
        recruiterName: licenseData.recruiter_name || "Agente DreamLive",
        limitRequests: licenseData.limit_requests || 60,
        refreshMinutes: licenseData.refresh_minutes || 720,
        maxDevices: licenseData.max_devices || 1,
      };

      await browser.storage.local.set({ savedLicense: updatedLicenseInfo });

      return { isValid: true };
    } catch (err: any) {
      console.error("❌ [LICENSE] Error validating license:", err);
      return {
        isValid: false,
        error: "Error de conexión con el servidor: " + err.message,
      };
    }
  },
};
