// ============================================================
// /api/settings/sync — titik ujung sinkronisasi pengaturan
// ============================================================
// Dipakai oleh salinan website ter-deploy (simpul tepi) untuk:
//   GET  → menarik setelan terbaru dari pusat (header x-sync-secret)
//   POST → mendorong setelan ke pusat (body { secret, version, settings })
//
// Pada sandbox (pusat), route ini MENYIMPAN dorongan dari tepi dan
// MENYAJIKAN setelan terbaru — menjadikan database sandbox sumber
// kebenaran yang tahan lama. Pada simpul tepi, route juga berfungsi
// (mis. dipakai VPS lain) tetapi biasanya tak dipanggil karena tepi
// yang berperan sebagai klien.
//
// Keamanan: wajib mencocokkan Setting.syncSecret (≥10 karakter).
// Kunci privat (admin*) dan konfigurasi sinkron TIDAK pernah lewat sini.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildSyncPayload, SYNC_CONFIG_KEYS, SYNC_PRIVATE_KEYS } from "@/lib/settings-sync";

async function rahasiaValid(ss: string | null): Promise<boolean> {
  if (!ss || ss.length < 10) return false;
  const row = await db.setting.findUnique({ where: { key: "syncSecret" } });
  return !!row && row.value === ss;
}

async function versiLokal(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: "syncVersion" } });
  const n = parseInt(row?.value || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await rahasiaValid(req.headers.get("x-sync-secret")))) {
      return Response.json({ error: "Rahasia sinkronisasi salah." }, { status: 401 });
    }
    return Response.json({ version: await versiLokal(), settings: await buildSyncPayload() });
  } catch {
    return Response.json({ error: "Gagal menyiapkan setelan." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      secret?: string;
      version?: number;
      settings?: Record<string, string>;
    };
    if (!(await rahasiaValid(body.secret ?? null))) {
      return Response.json({ error: "Rahasia sinkronisasi salah." }, { status: 401 });
    }
    if (typeof body.settings !== "object" || body.settings === null) {
      return Response.json({ error: "Payload setelan tidak valid." }, { status: 400 });
    }
    const versiMasuk = Math.floor(Number(body.version) || 0);
    const kunciDilarang = new Set<string>([...SYNC_PRIVATE_KEYS, ...SYNC_CONFIG_KEYS]);
    let n = 0;
    for (const [key, value] of Object.entries(body.settings)) {
      if (typeof value !== "string") continue;
      if (kunciDilarang.has(key) || key.startsWith("admin")) continue;
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
      n++;
    }
    // Versi pusat mengikuti yang terbesar (last-writer-wins)
    const versiBaru = Math.max(await versiLokal(), versiMasuk);
    if (versiMasuk > 0 && versiBaru > (await versiLokal())) {
      await db.setting.upsert({
        where: { key: "syncVersion" },
        update: { value: String(versiBaru) },
        create: { key: "syncVersion", value: String(versiBaru) },
      });
    }
    return Response.json({ ok: true, applied: n, version: versiBaru });
  } catch {
    return Response.json({ error: "Gagal menyimpan setelan masukan." }, { status: 500 });
  }
}
