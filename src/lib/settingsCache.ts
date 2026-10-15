import { FALLBACK_SETTINGS } from "./constants";
import type { SettingsMap } from "./types";

const KUNCI_CACHE = "b2b_live_settings";

export function getCachedSettings(): SettingsMap {
  if (typeof window === "undefined") return FALLBACK_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KUNCI_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.brandPrimary) {
        return { ...FALLBACK_SETTINGS, ...parsed };
      }
    }
  } catch {
    // abaikan kesalahan storage
  }
  return FALLBACK_SETTINGS;
}

export function saveCachedSettings(settings: SettingsMap): void {
  if (typeof window === "undefined" || !settings) return;
  try {
    window.localStorage.setItem(KUNCI_CACHE, JSON.stringify(settings));
    // Simpan juga aksen untuk konsistensi CSS
    if (settings.accentColor || settings.headerColor) {
      window.localStorage.setItem(
        "bp-setelan-aksen",
        JSON.stringify({ accentColor: settings.accentColor, headerColor: settings.headerColor })
      );
    }
  } catch {
    // abaikan jika storage penuh
  }
}
