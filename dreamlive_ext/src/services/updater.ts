import { supabase } from "@/utils/supabase";
import { browser } from "wxt/browser";

export const UpdaterService = {
  isNewer(remote: string, local: string) {
    if (!remote || !local) return false;
    const v1 = remote.split(".").map(Number);
    const v2 = local.split(".").map(Number);
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
    return false;
  },

  async checkForUpdates() {
    try {
      const currentVersion = browser.runtime.getManifest().version;
      const { data, error } = await supabase
        .from("app_versions")
        .select("version_number")
        .eq("is_active", true)
        .order("release_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const remoteVersion = (data as any).version_number;
      if (this.isNewer(remoteVersion, currentVersion)) {
        // await browser.action.setBadgeText({ text: "UP" });
        await browser.action.setBadgeBackgroundColor({ color: "#ef4444" });
        await browser.storage.local.set({ updateAvailable: remoteVersion });
      } else {
        await browser.storage.local.remove("updateAvailable");
      }
    } catch (err) {
      console.error("Error updates:", err);
    }
  },
};
