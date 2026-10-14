/**
 * Helper bersama untuk laporan ekspor pesan (PDF & XLSX).
 * Format tanggal/jam manual (tanpa ICU) agar konsisten di semua runtime.
 */

export const STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  selesai: "Selesai",
};

/** Warna status untuk sel laporan (hex tanpa #). */
export const STATUS_COLOR: Record<string, string> = {
  baru: "b91c1c", // merah
  dibaca: "64748b", // abu-abu
  selesai: "15803d", // hijau
};

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 27/09/2026 */
export function fmtDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 23.06 */
export function fmtTime(d: Date): string {
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

/** 20260927-2306 — untuk nama file unduhan. */
export function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** "30 Kg" / "-" */
export function kebutuhan(quantity: string, unit: string): string {
  const q = (quantity || "").trim();
  const u = (unit || "").trim();
  return q ? `${q}${u ? ` ${u}` : ""}` : "-";
}

/** Normalisasi warna header dari setting (hex dengan #) → hex 6 digit tanpa #; fallback abu gelap. */
export function safeHex(raw: string | undefined, fallback = "1e293b"): string {
  const v = (raw || "").replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}
