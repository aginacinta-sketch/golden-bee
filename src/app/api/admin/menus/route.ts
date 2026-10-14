import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest } from "@/lib/admin";
import { serializeModel } from "@/lib/serialize";

// Daftar semua menu (termasuk tersembunyi) — untuk admin
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const items = await db.menuItem.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return Response.json(items.map(serializeModel));
}

// Tambah menu
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const label = String(body.label ?? "").trim();
    if (!label) return badRequest("Nama menu wajib diisi.");
    const maxOrder = await db.menuItem.aggregate({ _max: { order: true } });
    const item = await db.menuItem.create({
      data: {
        label,
        target: String(body.target ?? "#produk"),
        icon: String(body.icon ?? ""),
        visible: Boolean(body.visible ?? true),
        order: Number(body.order ?? (maxOrder._max.order ?? 0) + 1),
      },
    });
    return Response.json(serializeModel(item), { status: 201 });
  } catch (e) {
    return Response.json({ error: "Gagal menambah menu" }, { status: 500 });
  }
}
