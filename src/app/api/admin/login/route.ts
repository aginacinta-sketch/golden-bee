import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSettingsMap, setSettings } from "@/lib/admin";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { password } = (await req.json()) as { password?: string };
    if (!password) {
      return Response.json({ error: "Kata sandi wajib diisi." }, { status: 400 });
    }
    const map = await getSettingsMap();
    if (password !== map.adminPassword) {
      return Response.json({ error: "Kata sandi salah." }, { status: 401 });
    }
    // Buat / perbarui token sesi
    const token = randomUUID();
    await setSettings({ adminToken: token });
    return Response.json({ token });
  } catch (e) {
    return Response.json({ error: "Gagal masuk" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Logout: hapus token
  try {
    await db.setting.deleteMany({ where: { key: "adminToken" } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal keluar" }, { status: 500 });
  }
}
