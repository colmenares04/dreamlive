import { browser } from "wxt/browser";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";

/**
 * Helper genérico INTELIGENTE para abrir o enfocar pestañas
 */
const openOrFocusTab = async (targetUrl: string, matchPattern: string) => {
  // Buscamos si ya existe una pestaña que coincida con el patrón (ej: cualquier pág de backstage)
  const tabs = await browser.tabs.query({ url: matchPattern });
  const existingTab = tabs[0];

  if (existingTab?.id) {
    // 🧠 LÓGICA SMART:
    // Si ya estamos EXACTAMENTE en la URL que queremos, solo enfocamos. NO recargamos.
    if (existingTab.url === targetUrl) {
      console.log(
        "⚡ Ya estás en la pestaña correcta. Enfocando sin recargar.",
      );
      await browser.tabs.update(existingTab.id, { active: true });
    } else {
      // Si estamos en backstage pero en otra sección, navegamos ahí.
      console.log("✈️ Navegando a la sección correcta...");
      await browser.tabs.update(existingTab.id, {
        active: true,
        url: targetUrl,
      });
    }

    // Traer la ventana al frente
    if (existingTab.windowId) {
      await browser.windows.update(existingTab.windowId, { focused: true });
    }
  } else {
    // Si no existe, creamos una nueva
    await browser.tabs.create({ url: targetUrl });
  }
};

/**
 * Obtiene una palabra clave aleatoria de la configuración
 */
const getSearchKeyword = async (): Promise<string> => {
  try {
    const license = await licenseService.getStoredLicense();
    const licenseData = license as any;
    const licenseId =
      licenseData?.id || licenseData?.licenseKey || licenseData?.key;

    if (!licenseId) return "batallas";

    // Consultamos las keywords
    const { data } = await supabase
      .from("licenses")
      .select("keywords")
      .eq("license_key", licenseId)
      .maybeSingle<{ keywords: string | null }>();

    let keywordsRaw = data?.keywords;

    // Fallback ID
    if (!keywordsRaw) {
      const { data: dataId } = await supabase
        .from("licenses")
        .select("keywords")
        .eq("id", licenseId)
        .maybeSingle<{ keywords: string | null }>();
      keywordsRaw = dataId?.keywords;
    }

    if (keywordsRaw) {
      const words = keywordsRaw.split("/").filter((w) => w.trim().length > 0);
      if (words.length > 0) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        return randomWord;
      }
    }
  } catch (e) {
    console.error("Error obteniendo keywords", e);
  }
  return "batallas"; // Fallback final
};

// ✅ Botón "Ir a los LIVES"
export const openTikTokBattles = async () => {
  const keyword = await getSearchKeyword();
  console.log(`🔍 Abriendo búsqueda para: ${keyword}`);

  await openOrFocusTab(
    `https://www.tiktok.com/search/live?q=${encodeURIComponent(keyword)}`,
    "*://*.tiktok.com/search/live*",
  );
};

// ✅ Botón "Backstage"
export const openBackstage = async () => {
  await openOrFocusTab(
    "https://live-backstage.tiktok.com/portal/anchor/relation",
    "*://live-backstage.tiktok.com/*",
  );
};
