/**
 * Nada notifikasi live chat — dentang via Web Audio API, tanpa berkas audio eksternal.
 * Dipakai DUA sisi:
 *  - "admin"      → pesan pengunjung masuk (panel admin / widget admin /
 *                   notifikasi toast admin). Menghasilkan dentang 3-nada jernih
 *                   ("ding-dang-dong") agar admin sigap merespons cepat.
 *  - "pengunjung" → balasan admin masuk (widget chat pengunjung: "ting-tung").
 *
 * Perlindungan & keandalan:
 *  - Disimpan di localStorage per sisi (default: aktif).
 *  - Bila AudioContext dalam keadaan suspended (kebijakan autoplay browser),
 *    audio otomatis dicoba resume lalu langsung membunyikan nada.
 *  - Listener pointerdown/keydown membuka kunci audio secara proaktif begitu
 *    pengguna berinteraksi dengan halaman.
 *  - Dilengkapi fungsi bukaKunciAudio() dan ujiNadaAdmin().
 *  - Throttle 600 ms agar pesan beruntun tidak menumpuk bising.
 */

export type SisiNada = "admin" | "pengunjung";

const KUNCI_NADA: Record<SisiNada, string> = {
  admin: "b2b_nada_notif_admin",
  pengunjung: "b2b_nada_notif_pengunjung",
};

/** Jeda minimum antar dentang (ms) agar pesan beruntun tidak menumpuk. */
const JEDA_ANTAR_NADA_MS = 600;

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
    window.dispatchEvent(
      new CustomEvent("b2b-nada-status-changed", { detail: { sisi, aktif } })
    );
  } catch {
    // abaikan — penyimpanan tidak tersedia
  }
}

function dapatkanKonteks(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AC();
    } catch {
      return null;
    }
    // Begitu pengguna berinteraksi apa pun, aktifkan kembali context yang
    // ditangguhkan kebijakan autoplay browser — dentang berikutnya pasti berbunyi.
    const lanjutkan = () => {
      if (audioCtx && audioCtx.state === "suspended") {
        void audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", lanjutkan, { passive: true });
    window.addEventListener("click", lanjutkan, { passive: true });
    window.addEventListener("keydown", lanjutkan, { passive: true });
    window.addEventListener("touchstart", lanjutkan, { passive: true });
  }
  return audioCtx;
}

/** Buka kunci AudioContext secara proaktif lewat interaksi pengguna. */
export async function bukaKunciAudio(): Promise<boolean> {
  const ctx = dapatkanKonteks();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx.state === "running";
  } catch {
    return false;
  }
}

function bunyikan(ctx: AudioContext, sisi: SisiNada) {
  try {
    const t0 = ctx.currentTime + 0.02;

    if (sisi === "admin") {
      // Dentang 3-nada jernih ceria untuk admin ("A5 -> D6 -> F#6")
      // Cukup menonjol agar terdengar saat admin bekerja di tab/jendela lain.
      const nadaAdmin = [
        { f: 880, mulai: 0, durasi: 0.18, vol: 0.28 }, // A5
        { f: 1174.66, mulai: 0.12, durasi: 0.22, vol: 0.32 }, // D6
        { f: 1479.98, mulai: 0.26, durasi: 0.45, vol: 0.35 }, // F#6
      ];

      for (const n of nadaAdmin) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.f, t0 + n.mulai);
        gain.gain.setValueAtTime(0.0001, t0 + n.mulai);
        gain.gain.exponentialRampToValueAtTime(n.vol, t0 + n.mulai + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.mulai + n.durasi);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + n.mulai);
        osc.stop(t0 + n.mulai + n.durasi + 0.05);
      }
    } else {
      // 2-nada lembut untuk pengunjung ("ting-tung")
      const nadaPengunjung = [
        { f: 880, mulai: 0, durasi: 0.22, vol: 0.22 },
        { f: 1174.66, mulai: 0.15, durasi: 0.4, vol: 0.25 },
      ];

      for (const n of nadaPengunjung) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.f, t0 + n.mulai);
        gain.gain.setValueAtTime(0.0001, t0 + n.mulai);
        gain.gain.exponentialRampToValueAtTime(n.vol, t0 + n.mulai + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.mulai + n.durasi);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + n.mulai);
        osc.stop(t0 + n.mulai + n.durasi + 0.05);
      }
    }
  } catch {
    // abaikan jika audio tidak didukung
  }
}

/**
 * Mainkan dentang notifikasi untuk pesan masuk pada sisi tertentu.
 * Otomatis menangani context suspended agar nada tidak hilang.
 */
export function mainkanNadaPesanMasuk(sisi: SisiNada) {
  try {
    if (!apakahNadaAktif(sisi)) return;
    const kini = Date.now();
    if (kini - pemutarTerakhir < JEDA_ANTAR_NADA_MS) return;
    pemutarTerakhir = kini;

    const ctx = dapatkanKonteks();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => {
          if (ctx.state === "running") {
            bunyikan(ctx, sisi);
          }
        })
        .catch(() => {});
      return;
    }

    bunyikan(ctx, sisi);
  } catch {
    // abaikan — lingkungan tanpa audio
  }
}

/** Uji nada notifikasi admin (memastikan suara aktif dan volume terdengar). */
export async function ujiNadaAdmin(): Promise<boolean> {
  const ctx = dapatkanKonteks();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    bunyikan(ctx, "admin");
    return true;
  } catch {
    return false;
  }
}
