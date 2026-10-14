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
    const name = String(body.name ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!name || !content) return badRequest("Nama dan isi testimoni wajib diisi.");
    const item = await db.testimonial.update({
      where: { id },
      data: {
        name,
        role: String(body.role ?? ""),
        company: String(body.company ?? ""),
        content,
        photo: String(body.photo ?? ""),
        rating: Math.min(5, Math.max(1, Number(body.rating ?? 5))),
        visible: Boolean(body.visible ?? true),
        order: Number(body.order ?? 0),
      },
    });
    return Response.json(serializeModel(item));
  } catch (e) {
    return Response.json({ error: "Gagal memperbarui testimoni" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    await db.testimonial.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal menghapus testimoni" }, { status: 500 });
  }
}
