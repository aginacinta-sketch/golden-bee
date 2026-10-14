import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { serializeProduct } from "@/lib/serialize";

// Katalog produk publik (hanya yang aktif)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const products = await db.product.findMany({
      where: {
        active: true,
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { description: { contains: search } },
                  { category: { contains: search } },
                ],
              }
            : {},
          category ? { category } : {},
        ],
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return Response.json(products.map(serializeProduct));
  } catch (e) {
    return Response.json({ error: "Gagal memuat produk" }, { status: 500 });
  }
}
