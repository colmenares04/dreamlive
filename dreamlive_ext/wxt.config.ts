import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",

  manifest: {
    name: "Dreamlive Tool",
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "128": "icon/128.png",
    },
    permissions: [
      "storage",
      "tabs",
      "alarms",
      "activeTab",
      "scripting",
      "clipboardWrite",
    ],
    host_permissions: [
      "*://*.tiktok.com/*",
      "https://vcdynhqtslgtkmmxoire.supabase.co/*",
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' http://localhost:*; object-src 'self'; connect-src https://vcdynhqtslgtkmmxoire.supabase.co https://api.ipify.org ws://localhost:* http://localhost:*",
    },
  },

  runner: {
    /*  binaries: {
      chrome: BRAVE_PATH,
    },*/
    chromiumArgs: [
      "--start-maximized",
      "--disable-infobars",
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  },
});
