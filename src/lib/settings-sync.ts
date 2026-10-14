// ============================================================
// SINKRONISASI PENGATURAN: salinan ter-deploy ⇄ pusat (sandbox)
// ============================================================
// LATAR MASALAH (keluhan: "link kustom QR hilang setelah beberapa jam"):
// Website hasil Publish berjalan di salinan database sendiri yang sifatnya
// EPHEMERAL — platform dapat mendaur ulang (recycle) instans kapan saja
// (terbukti: HTTP 410 "Recycled"). Saat instans bangkit ulang, database
// kembali ke isi paket terakhir (hasil Publish), sehingga perubahan yang
// dilakukan lewat Admin Panel di URL publik HILANG.
//
// SOLUSI: jadikan database sandbox (URL preview) sebagai "pusat data"
// yang tahan lama, dan salinan ter-deploy sebagai "simpul tepi":
//   1) SIMPAN di URL publik  → nilai juga DIKIRIM (push) ke pusat.
//   2) Instans publik bangkit ulang → saat boot DARI pusat (pull) ditarik
//      setelan terbaru → link QR kustom otomatis kembali, tanpa Publish ulang.
//   3) Simpan di URL preview (pusat) → simpul tepi menarik otomatis.
//
// Aturan konflik: LAST-WRITER-WINS per seluruh peta setelan memakai
// penghitung `syncVersion` (bilangan bulat naik di sisi yang menyimpan;
// penerima mengambil versi terbesar). Kunci rahasia & konfigurasi sinkron
// TIDAK pernah ikut tersinkron.
//
// Sinkronisasi HANYA aktif pada simpul tepi (NODE_ENV=production DAN
// syncCentralUrl terisi). Sandbox dev = pusat, tidak pernah menarik/mendorong.

import { db } from "@/lib/db";

/** Kunci internal sinkronisasi — tidak pernah ikut payload & tidak boleh bocor ke publik */
export const SYNC_CONFIG_KEYS = [
  "syncCentralUrl",
  "syncSecret",
  "syncVersion",
  "syncPending",
  "syncLastPullAt",
  "syncLastPushAt",
] as const;

/** Kunci privat (kredensial) — tidak pernah ikut sinkronisasi */
export const SYNC_PRIVATE_KEYS = ["adminPassword", "adminToken", "adminGateKey"] as const;

/** Kunci yang diawali prefiks ini juga disanitasi dari payload (proteksi ganda) */
const PRIVATE_PREFIX = "admin";

type SyncResult = { ok: boolean; applied?: boolean; detail?: string };

async function getSetting(key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

function versiToInt(raw: string | null | undefined): number {
  const n = parseInt(raw || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** URL pusat + rahasia tersedia? (syarat: simpul tepi = production) */
async function konfigurasiTepi(): Promise<{ url: string; secret: string } | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const url = (await getSetting("syncCentralUrl"))?.trim();
  const secret = (await getSetting("syncSecret"))?.trim();
  if (!url || !secret || secret.length < 10) return null;
  return { url: url.replace(/\/+$/, ""), secret };
}

/** Apakah sinkronisasi ke pusat aktif pada node ini? (aman dipanggil dari route) */
export async function sinkronAktif(): Promise<boolean> {
  try {
    return (await konfigurasiTepi()) !== null;
  } catch {
    return false;
  }
}

/** Peta setelan yang aman untuk disinkronkan (tanpa kunci privat & konfigurasi) */
export async function buildSyncPayload(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) {
    if ((SYNC_PRIVATE_KEYS as readonly string[]).includes(r.key)) continue;
    if ((SYNC_CONFIG_KEYS as readonly string[]).includes(r.key)) continue;
    if (r.key.startsWith(PRIVATE_PREFIX)) continue;
    map[r.key] = r.value;
  }
  return map;
}

/** Terapkan setelan dari pusat ke DB lokal (kunci privat & konfigurasi dilewati) */
async function applyRemoteSettings(remote: Record<string, string>): Promise<number> {
  let n = 0;
  for (const [key, value] of Object.entries(remote)) {
    if (typeof value !== "string") continue;
    if ((SYNC_PRIVATE_KEYS as readonly string[]).includes(key)) continue;
    if ((SYNC_CONFIG_KEYS as readonly string[]).includes(key)) continue;
    if (key.startsWith(PRIVATE_PREFIX)) continue;
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    n++;
  }
  return n;
}

/**
 * Tarik setelan terbaru dari pusat. Dipakai saat boot instans tepi, berkala,
 * dan dikikis pelan dari GET /api/settings.
 * Menghasilkan { ok:true, applied:true } bila versi pusat lebih baru & diterapkan.
 */
export async function pullFromCentral(alasan = "manual"): Promise<SyncResult> {
  const cfg = await konfigurasiTepi();
  if (!cfg) return { ok: false, applied: false, detail: "nonaktif" };
  try {
    const res = await fetch(`${cfg.url}/api/settings/sync`, {
      headers: { "x-sync-secret": cfg.secret },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { version?: number; settings?: Record<string, string> };
    const versiRemote = Math.floor(Number(data.version) || 0);
    const versiLokal = versiToInt(await getSetting("syncVersion"));
    if (typeof data.settings !== "object" || data.settings === null) {
      throw new Error("payload tidak valid");
    }
    if (versiRemote <= versiLokal) {
      await setSetting("syncLastPullAt", new Date().toISOString());
      return { ok: true, applied: false, detail: "sudah-terbaru" };
    }
    const n = await applyRemoteSettings(data.settings ?? {});
    await setSetting("syncVersion", String(versiRemote));
    await setSetting("syncLastPullAt", new Date().toISOString());
    console.log(`[sync] tarik(${alasan}): ${n} kunci diterapkan, versi ${versiRemote}`);
    return { ok: true, applied: true, detail: `${n} kunci` };
  } catch (e) {
    return { ok: false, applied: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Dorong seluruh setelan lokal ke pusat memakai versi yang SUDAH dinaikkan
 * penulis (PUT /api/settings). Bila gagal, tandai syncPending=1 agar
 * dicoba ulang berkala oleh bootSync/maybePullThrottled.
 */
export async function pushToCentral(): Promise<SyncResult> {
  const cfg = await konfigurasiTepi();
  if (!cfg) return { ok: false, detail: "nonaktif" };
  try {
    let versiBaru = versiToInt(await getSetting("syncVersion"));
    if (versiBaru < 1) versiBaru = 1;
    const settings = await buildSyncPayload();
    const res = await fetch(`${cfg.url}/api/settings/sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: cfg.secret, version: versiBaru, settings }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await setSetting("syncPending", "0");
    await setSetting("syncLastPushAt", new Date().toISOString());
    console.log(`[sync] dorong: ${Object.keys(settings).length} kunci, versi ${versiBaru}`);
    return { ok: true, detail: "terkirim" };
  } catch (e) {
    await setSetting("syncPending", "1");
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Tarik pelan dengan pembatas waktu (dipanggil fire-and-forget dari GET /api/settings) */
let sedangTarik = false;
export async function maybePullThrottled(jedaMs = 60_000): Promise<void> {
  if (process.env.NODE_ENV !== "production" || sedangTarik) return;
  try {
    const terakhir = await getSetting("syncLastPullAt");
    if (terakhir && Date.now() - new Date(terakhir).getTime() < jedaMs) return;
  } catch {
    // DB bermasalah — biarkan percobaan berikutnya
    return;
  }
  sedangTarik = true;
  try {
    await pullFromCentral("kikis");
    const pending = await getSetting("syncPending");
    if (pending === "1") await pushToCentral(); // sekaligus coba ulang dorongan tertunda
  } finally {
    sedangTarik = false;
  }
}

/** Dipanggil sekali dari instrumentation.register() saat server produksi boot */
let sudahBoot = false;
export async function bootSync(): Promise<void> {
  if (sudahBoot) return;
  sudahBoot = true;
  if (process.env.NODE_ENV !== "production") return;
  // Beri jeda agar server siap dulu, lalu tarik setelan terbaru dari pusat —
  // inilah yang membuat link QR kustom selamat dari daur ulang instans.
  setTimeout(() => {
    void pullFromCentral("boot").catch(() => {});
  }, 5000);
  // Berkala: tarik perubahan dari pusat + ulangi dorongan yang tertunda.
  const timer = setInterval(() => {
    void pullFromCentral("berkala")
      .catch(() => {})
      .then(() => getSetting("syncPending"))
      .then((p) => (p === "1" ? pushToCentral() : undefined))
      .catch(() => {});
  }, 15 * 60 * 1000);
  if (typeof timer.unref === "function") timer.unref();
}
