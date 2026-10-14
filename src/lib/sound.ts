/**
 * Nada notifikasi live chat — dentang lembut dua nada ("ting-tung") via
 * Web Audio API, tanpa berkas audio eksternal. Dipakai DUA sisi:
 *  - "admin"      → pesan pengunjung masuk (panel admin / widget admin /
 *                   toast notifikasi pesan)
 *  - "pengunjung" → balasan admin masuk (widget chat pengunjung)
 *
 * Perlindungan agar nada selalu terdengar SAAT TEPAT dan tidak mengganggu:
 *  - Bisa dimatikan per sisi dari tombol pengeras suara di kepala panel —
 *    tersimpan di localStorage (perangkat/browser), bawaan: menyala.
 *  - Context suspended (belum ada interaksi pengguna — kebijakan autoplay
 *    browser): nada TIDAK dijadwalkan (osilator akan menumpuk dan berbunyi
 *    serentak saat context resume); resume dicoba otomatis pada interaksi
 *    berikutnya sehingga pesan berikutnya tetap berbunyi.
 *  - Throttle 800 ms — pesan beruntun tidak menumpuk dentang.
 *  - Lingkungan tanpa dukungan audio → dilewati diam-diam.
 */

export type SisiNada = "admin" | "pengunjung";

const KUNCI_NADA: Record<SisiNada, string> = {
  admin: "b2b_nada_notif_admin",
  pengunjung: "b2b_nada_notif_pengunjung",
};

/** Jeda minimum antar dentang (ms) agar pesan beruntun tidak menumpuk. */
const JEDA_ANTAR_NADA_MS = 800;

let audioCtx: AudioContext | null = null;
let pemutarTerakhir = 0;

/** Bila false, dentang sisi ini dibisukan (tersimpan di localStorage). */
export function apakahNadaAktif(sisi: SisiNada): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KUNCI_NADA[sisi]) !== "off";
  } catch {
    return true;
  }
}

/** Simpan preferensi nada sisi tertentu (bawaan menyala = key dihapus). */
export function setNadaAktif(sisi: SisiNada, aktif: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (aktif) window.localStorage.removeItem(KUNCI_NADA[sisi]);
    else window.localStorage.setItem(KUNCI_NADA[sisi], "off");
  } catch {
    // abaikan — penyimpanan tidak tersedia (mode privat, dsb.)
  }
}

function dapatkanKonteks(): AudioContext | null {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    audioCtx = new AC();
    // Begitu pengguna berinteraksi apa pun, aktifkan kembali context yang
    // ditangguhkan kebijakan autoplay — dentang berikutnya pasti berbunyi.
    const lanjutkan = () => {
      if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
    };
    window.addEventListener("pointerdown", lanjutkan);
    window.addEventListener("keydown", lanjutkan);
    window.addEventListener("touchstart", lanjutkan, { passive: true });
  }
  return audioCtx;
}

/**
 * Mainkan dentang "ting-tung" untuk pesan masuk pada sisi tertentu.
 * Aman dipanggil dari mana saja (timer/socket) — semua pembatasan internal.
 */
export function mainkanNadaPesanMasuk(sisi: SisiNada) {
  try {
    if (!apakahNadaAktif(sisi)) return;
    const kini = Date.now();
    if (kini - pemutarTerakhir < JEDA_ANTAR_NADA_MS) return;
    const ctx = dapatkanKonteks();
    if (!ctx) return;
    // Context masih ditangguhkan (belum ada interaksi pengguna): jangan
    // jadwalkan nada — osilator akan menumpuk dan berbunyi serentak nanti.
    if (ctx.state === "suspended") {
      void ctx.resume();
      return;
    }
    pemutarTerakhir = kini;

    const t0 = ctx.currentTime + 0.02;
    const nada: { f: number; mulai: number; durasi: number }[] = [
      { f: 880, mulai: 0, durasi: 0.22 }, // A5 — "ting"
      { f: 1174.66, mulai: 0.15, durasi: 0.4 }, // D6 — "tung"
    ];
    for (const n of nada) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, t0 + n.mulai);
      gain.gain.setValueAtTime(0.0001, t0 + n.mulai);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + n.mulai + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.mulai + n.durasi);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.mulai);
      osc.stop(t0 + n.mulai + n.durasi + 0.05);
    }
  } catch {
    // abaikan — lingkungan tanpa dukungan audio
  }
}
