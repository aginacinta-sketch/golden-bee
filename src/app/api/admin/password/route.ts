import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest, setSettings } from "@/lib/admin";

// Ganti kata sandi admin
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const current = String(body.currentPassword ?? "");
    const next = String(body.newPassword ?? "");
    const confirm = String(body.confirmPassword ?? "");

    const s = await db.setting.findUnique({ where: { key: "adminPassword" } });
    const stored = s?.value ?? "admin123";
    if (current !== stored) return badRequest("Kata sandi saat ini salah.");
    if (next.length < 5) return badRequest("Kata sandi baru minimal 5 karakter.");
    if (next !== confirm) return badRequest("Konfirmasi kata sandi tidak cocok.");

    await setSettings({ adminPassword: next });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal mengganti kata sandi" }, { status: 500 });
  }
}
