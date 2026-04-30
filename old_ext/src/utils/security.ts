import { browser } from "wxt/browser";
import { UAParser } from "ua-parser-js";

interface DeviceMetadata {
  deviceId: string;
  browser: string;
  os: string;
  ipAddress: string;
}

/**
 * Obtiene la IP pública del usuario usando un servicio externo
 */
const getPublicIP = async (): Promise<string> => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip || "Unknown";
  } catch (error) {
    console.warn("⚠️ No se pudo obtener la IP pública:", error);
    return "Unknown";
  }
};

/**
 * Obtiene el ID único y metadatos del dispositivo.
 */
export const getDeviceMetadata = async (): Promise<DeviceMetadata> => {
  let deviceId = "";
  try {
    const storage = await browser.storage.local.get("device_id");
    if (storage.device_id) {
      deviceId = storage.device_id as string;
    } else {
      deviceId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
      await browser.storage.local.set({ device_id: deviceId });
      console.log("🔒 Nuevo Device ID generado:", deviceId);
    }
  } catch (error) {
    console.error("Error gestionando Device ID:", error);
    deviceId = "unknown-" + Date.now();
  }

  // Obtener Browser y OS
  // @ts-ignore
  const parser = new UAParser();
  const result = parser.getResult();
  const browserName =
    `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim();
  const osName =
    `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim();

  // Obtener IP pública
  const ipAddress = await getPublicIP();

  return {
    deviceId,
    browser: browserName,
    os: osName,
    ipAddress,
  };
};

// Mantenemos retrocompatibilidad por si acaso, aunque idealmente usaremos la nueva
export const getDeviceId = async (): Promise<string> => {
  const meta = await getDeviceMetadata();
  return meta.deviceId;
};
