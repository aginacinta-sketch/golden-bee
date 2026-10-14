import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest } from "@/lib/admin";
import { serializeModel } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const label = String(body.label ?? "").trim();
    if (!label) return badRequest("Nama menu wajib diisi.");
    const item = await db.menuItem.update({
      where: { id },
      data: {
        label,
        target: String(body.target ?? "#produk"),
        icon: String(body.icon ?? ""),
        visible: Boolean(body.visible ?? true),
        order: Number(body.order ?? 0),
      },
    });
    return Response.json(serializeModel(item));
  } catch (e) {
    return Response.json({ error: "Gagal memperbarui menu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    await db.menuItem.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal menghapus menu" }, { status: 500 });
  }
}
