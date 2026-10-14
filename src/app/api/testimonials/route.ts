import { db } from "@/lib/db";
import { serializeModel } from "@/lib/serialize";

// Testimoni publik (hanya yang tampil)
export async function GET() {
  try {
    const items = await db.testimonial.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return Response.json(items.map(serializeModel));
  } catch (e) {
    return Response.json({ error: "Gagal memuat testimoni" }, { status: 500 });
  }
}
