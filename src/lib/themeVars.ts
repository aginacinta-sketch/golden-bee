/**
 * Sinkronkan variabel tema situs (--bp-*) ke :root (documentElement)
 * agar elemen yang dirender di React portal (Dialog, Select, Toaster, dll.)
 * di luar wrapper halaman tetap mewarisi warna tema terkini.
 */
export function applyThemeVars(opts: { accent?: string; header?: string }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (opts.accent) root.style.setProperty("--bp-accent", opts.accent);
  if (opts.header) root.style.setProperty("--bp-header", opts.header);
}
