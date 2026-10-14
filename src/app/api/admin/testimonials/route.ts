import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest } from "@/lib/admin";
import { serializeModel } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const items = await db.testimonial.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
  return Response.json(items.map(serializeModel));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!name || !content) return badRequest("Nama dan isi testimoni wajib diisi.");
    const maxOrder = await db.testimonial.aggregate({ _max: { order: true } });
    const item = await db.testimonial.create({
      data: {
        name,
        role: String(body.role ?? ""),
        company: String(body.company ?? ""),
        content,
        photo: String(body.photo ?? ""),
        rating: Math.min(5, Math.max(1, Number(body.rating ?? 5))),
        visible: Boolean(body.visible ?? true),
        order: Number(body.order ?? (maxOrder._max.order ?? 0) + 1),
      },
    });
    return Response.json(serializeModel(item), { status: 201 });
  } catch (e) {
    return Response.json({ error: "Gagal menambah testimoni" }, { status: 500 });
  }
}
