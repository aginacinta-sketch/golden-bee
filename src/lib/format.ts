/**
 * Helper format tampilan (mata uang, harga) — dipakai kartu produk & dialog penawaran.
 */

/** Format angka ke gaya Indonesia: 115000 -> "115.000" */
export function fmtAngka(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Kapitalkasasi huruf pertama: "kg" -> "Kg" */
export function kapital(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Rentang harga Rupiah: "Rp 115.000 - Rp 145.000 / Kg".
 * - min & max terisi  -> rentang
 * - salah satu saja   -> satu nilai
 * - keduanya kosong   -> ""
 */
export function formatHarga(
  min: number | null | undefined,
  max: number | null | undefined,
  unit?: string
): string {
  if (min == null && max == null) return "";
  const u = unit ? kapital(unit) : "";
  const suffix = u ? ` / ${u}` : "";
  if (min != null && max != null && max > min) return `Rp ${fmtAngka(min)} - Rp ${fmtAngka(max)}${suffix}`;
  if (min != null) return `Rp ${fmtAngka(min)}${suffix}`;
  return `Rp ${fmtAngka(max as number)}${suffix}`;
}
