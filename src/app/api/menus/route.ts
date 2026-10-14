import { db } from "@/lib/db";
import { serializeModel } from "@/lib/serialize";

// Menu navigasi publik (hanya yang tampil)
export async function GET() {
  try {
    const items = await db.menuItem.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return Response.json(items.map(serializeModel));
  } catch (e) {
    return Response.json({ error: "Gagal memuat menu" }, { status: 500 });
  }
}
