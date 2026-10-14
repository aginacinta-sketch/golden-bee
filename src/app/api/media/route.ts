import { db } from "@/lib/db";

// Daftar metadata media (tanpa isi file)
export async function GET() {
  try {
    const items = await db.media.findMany({
      select: { id: true, name: true, mimeType: true, type: true, size: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(items.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch (e) {
    return Response.json({ error: "Gagal memuat media" }, { status: 500 });
  }
}
