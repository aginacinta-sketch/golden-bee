import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest } from "@/lib/admin";
import { serializeProduct } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) return badRequest("Nama produk wajib diisi.");

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        category: String(body.category ?? ""),
        description: String(body.description ?? ""),
        features: JSON.stringify(Array.isArray(body.features) ? body.features.map(String) : []),
        images: JSON.stringify(Array.isArray(body.images) ? body.images.map(String) : []),
        video: String(body.video ?? ""),
        unit: String(body.unit ?? ""),
        minOrder: String(body.minOrder ?? ""),
        priceMin: parsePrice(body.priceMin),
        priceMax: parsePrice(body.priceMax),
        featured: Boolean(body.featured ?? false),
        active: Boolean(body.active ?? true),
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });
    return Response.json(serializeProduct(product));
  } catch (e) {
    return Response.json({ error: "Gagal memperbarui produk" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal menghapus produk" }, { status: 500 });
  }
}

// Konversi input harga (angka / string / kosong) menjadi Float atau null
function parsePrice(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
