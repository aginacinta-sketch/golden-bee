/**
 * Helper tautan berbagi (QR code) + keamanan akses panel admin.
 *
 * Link hasil scan QR membawa penanda "via=qr" sehingga website terbuka
 * dalam MODE PUBLIK: panel admin tidak dapat dibuka (hash #admin diabaikan)
 * dan tombol Admin disembunyikan dari header.
 *
 * Pintu tersembunyi panel admin (antisipasi pengunjung yang mengetik
 * alamat + #admin): halaman login TIDAK PERNAH tampil hanya karena hash —
 * dibuka lewat tombol Admin di header, atau lewat tautan berkunci rahasia
 * `/?k=KUNCI#admin` (kunci bisa diganti dari tab Akun).
 */

export const QR_VIA_KEY = "via";
export const QR_VIA_VALUE = "qr";
export const PARAM_KUNCI = "k";

/** Cek apakah URL saat ini adalah mode publik dari link QR.
 *  Nilai dinormalisasi sehingga varian "?via=qr/" (garis miring sebelum
 *  hash — persis pola "?via=qr/#admin"), spasi, dan huruf kapital tetap
 *  dianggap mode publik. */
export function isPublicQrMode(search?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const nilai = new URLSearchParams(search ?? window.location.search).get(QR_VIA_KEY);
    if (!nilai) return false;
    return nilai.trim().replace(/\/+$/, "").toLowerCase() === QR_VIA_VALUE;
  } catch {
    return false;
  }
}

/**
 * Ambil kunci akses admin dari URL bila ada. Format didukung:
 *  - `/?k=KUNCI#admin`  (kunci pada query string)
 *  - `/#admin?k=KUNCI`  (kunci di dalam hash)
 * Mengembalikan null bila tidak ada kunci di URL.
 */
export function ambilKunciAkses(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const dariQuery = new URLSearchParams(window.location.search).get(PARAM_KUNCI);
    if (dariQuery) return dariQuery.trim();
    const hash = window.location.hash;
    const idx = hash.indexOf(`?${PARAM_KUNCI}=`);
    if (idx >= 0) {
      const nilai = new URLSearchParams(hash.slice(idx + 1)).get(PARAM_KUNCI);
      if (nilai) return nilai.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Bangun tautan berbagi untuk isi QR code:
 * origin + pathname + search + penanda via=qr — TANPA hash,
 * sehingga #admin tidak pernah ikut dalam tautan.
 */
export function buildShareUrl(): string {
  if (typeof window === "undefined") return "";
  const { origin, pathname, search } = window.location;
  if (isPublicQrMode(search)) return `${origin}${pathname}${search}`;
  const sep = search ? "&" : "?";
  return `${origin}${pathname}${search}${sep}${QR_VIA_KEY}=${QR_VIA_VALUE}`;
}

/**
 * Tambahkan penanda via=qr pada tautan kustom BILA tautan tersebut menunjuk
 * ke website ini sendiri (host sama), sehingga pengunjung yang membuka
 * website dari hasil scan QR selalu masuk mode publik (tanpa menu Admin).
 * Tautan eksternal (mis. wa.me, Google Maps) dikembalikan apa adanya.
 */
export function withQrMarkerIfSelf(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const target = new URL(rawUrl, window.location.origin);
    // Host berbeda = website lain, biarkan tanpa penanda
    if (target.host !== window.location.host) return rawUrl;
    if (target.searchParams.get(QR_VIA_KEY) === QR_VIA_VALUE) return target.toString();
    target.searchParams.set(QR_VIA_KEY, QR_VIA_VALUE);
    return target.toString();
  } catch {
    return rawUrl;
  }
}
