import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, json, unauthorized, badRequest } from "@/lib/admin";

/**
 * /api/admin/gate — pintu tersembunyi halaman login admin.
 *
 * GET tanpa `key`  → khusus admin ber-sesi: kembalikan kunci saat ini
 *                    (dipakai tab Akun untuk menampilkan tautan berkunci).
 * GET dengan `key` → PUBLIK: verifikasi kunci tautan berkunci. Respons hanya
 *                    200/401 — nilai kunci TIDAK PERNAH dikirim balik.
 * PUT {newKey}     → khusus admin ber-sesi: ganti kunci (minimal 5 karakter).
 *
 * Kunci disimpan di Setting "adminGateKey" (termasuk PRIVATE_KEYS — tidak
 * pernah bocor lewat /api/settings publik). Bila belum pernah diset,
 * dipakai kunci bawaan "goldenbee-admin".
 */

const KUNCI_BAWAAN = "goldenbee-admin";
const KUNCI_KEY_DB = "adminGateKey";

async function kunciSaatIni(): Promise<string> {
  const s = await db.setting.findUnique({ where: { key: KUNCI_KEY_DB } });
  return s?.value || KUNCI_BAWAAN;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    if (!(await isAdminRequest(req))) return unauthorized();
    return json({ key: await kunciSaatIni() });
  }
  // Verifikasi publik — cocok = 200, salah = 401, tanpa bocoran nilai.
  if (key !== (await kunciSaatIni())) return unauthorized();
  return json({ ok: true });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await req.json().catch(() => null)) as { newKey?: string } | null;
  const newKey = (body?.newKey ?? "").trim();
  if (newKey.length < 5) return badRequest("Kunci akses minimal 5 karakter.");
  await db.setting.upsert({
    where: { key: KUNCI_KEY_DB },
    update: { value: newKey },
    create: { key: KUNCI_KEY_DB, value: newKey },
  });
  return json({ ok: true });
}
