import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";
import { getDeviceMetadata } from "@/utils/security";

export const SecurityService = {
  async performHeartbeat() {
    try {
      const storage = await browser.storage.local.get(["savedLicense"]);
      const licenseKey = (storage.savedLicense as any)?.key;
      const licenseId = (storage.savedLicense as any)?.id;

      if (!licenseKey) return;

      console.log("🔒 [SECURITY] Performing heartbeat for license:", licenseId);

      const {
        deviceId,
        browser: browserName,
        os,
        ipAddress,
      } = await getDeviceMetadata();

      // 1. First, check if the license is still active in the database
      const { data: licenseData, error: licenseError } = await supabase
        .from("licenses")
        .select(`
          is_active, 
          expiration_date,
          license_key,
          recruiter_name,
          limit_requests,
          refresh_minutes,
          max_devices,
          agencies ( name )
        `)
        .eq("id", licenseId)
        .maybeSingle();

      if (licenseError) {
        console.error(
          "❌ [SECURITY] Error checking license status:",
          licenseError,
        );
        return;
      }

      // 2. Check if license was deleted
      if (!licenseData) {
        console.warn("🚨 [SECURITY] License deleted from database.");
        await browser.storage.local.remove("savedLicense");
        await browser.storage.local.set({
          authError: "Licencia eliminada por el administrador.",
        });
        await browser.action.setBadgeText({ text: "LOCK" });
        await browser.action.setBadgeBackgroundColor({ color: "#000000" });
        return;
      }

      const license = licenseData as any;

      // 3. Check if license is inactive
      if (!license.is_active) {
        console.warn("🚨 [SECURITY] License deactivated ");
        await browser.storage.local.remove("savedLicense");
        await browser.storage.local.set({
          authError: "Esta licencia ha sido desactivada por el administrador.",
        });
        await browser.action.setBadgeText({ text: "LOCK" });
        await browser.action.setBadgeBackgroundColor({ color: "#000000" });
        return;
      }

      // 4. Check if license is expired
      if (
        license.expiration_date &&
        new Date(license.expiration_date) < new Date()
      ) {
        console.warn("🚨 [SECURITY] License expired.");
        await browser.storage.local.remove("savedLicense");
        await browser.storage.local.set({
          authError: "La licencia ha expirado.",
        });
        await browser.action.setBadgeText({ text: "LOCK" });
        await browser.action.setBadgeBackgroundColor({ color: "#000000" });
        return;
      }

      console.log("✅ [SECURITY] License is valid");

      // Verify if license data has changed compared to local storage
      const oldLicense = storage.savedLicense as any;
      const updatedLicenseInfo = {
        id: licenseId,
        key: license.license_key,
        isActive: license.is_active,
        expirationDate: license.expiration_date,
        agencyName: license.agencies?.name || "Agencia Desconocida",
        recruiterName: license.recruiter_name || "Agente DreamLive",
        limitRequests: license.limit_requests || 60,
        refreshMinutes: license.refresh_minutes || 720,
        maxDevices: license.max_devices || 1,
      };

      const hasChanges = 
        oldLicense.key !== updatedLicenseInfo.key ||
        oldLicense.expirationDate !== updatedLicenseInfo.expirationDate ||
        oldLicense.recruiterName !== updatedLicenseInfo.recruiterName ||
        oldLicense.maxDevices !== updatedLicenseInfo.maxDevices ||
        oldLicense.limitRequests !== updatedLicenseInfo.limitRequests ||
        oldLicense.refreshMinutes !== updatedLicenseInfo.refreshMinutes ||
        oldLicense.agencyName !== updatedLicenseInfo.agencyName;

      if (hasChanges) {
        console.log("🔄 [SECURITY] License data changed in DB, updating local storage.");
        await browser.storage.local.set({ savedLicense: updatedLicenseInfo });
      }

      // 5. Update session heartbeat
      // Intentamos actualizar la sesión. Si no existe la fila, es que fuimos desconectados.
      // @ts-ignore: Supabase typing fix
      const { data, error } = await (supabase.from("license_sessions") as any)
        .update({
          last_ping: new Date().toISOString(),
          browser: browserName,
          os: os,
          ip_address: ipAddress,
        })
        .eq("device_id", deviceId)
        .eq("license_id", licenseId)
        .select()
        .maybeSingle();

      if (error) {
        console.error("❌ [SECURITY] Error updating session:", error);
        return;
      }

      // Si no hay data, significa que la sesión fue borrada (por límite de dispositivos o manual)
      if (!data) {
        console.warn("🚨 [SECURITY] Session invalidated remotely.");
        await browser.storage.local.remove("savedLicense");
        await browser.storage.local.set({
          authError: "Sesión cerrada: Límite de dispositivos excedido.",
        });
        await browser.action.setBadgeText({ text: "LOCK" });
        await browser.action.setBadgeBackgroundColor({ color: "#000000" });
        return;
      }

      const result = data as any;
      if (result.status === "blocked") {
        console.warn("🚨 [SECURITY] Session blocked.");
        await browser.storage.local.remove("savedLicense");
        await browser.storage.local.set({
          authError:
            result.message ||
            "Sesión cerrada: Licencia bloqueada por administrador.",
        });
        await browser.action.setBadgeText({ text: "LOCK" });
        await browser.action.setBadgeBackgroundColor({ color: "#000000" });
      } else {
        console.log("✅ [SECURITY] Heartbeat successful");
        const updateStorage =
          await browser.storage.local.get("updateAvailable");
        if (!updateStorage.updateAvailable) {
          await browser.action.setBadgeText({ text: "" });
        }
      }
    } catch (err) {
      console.error("❌ [SECURITY] Critical failure:", err);
    }
  },
};
