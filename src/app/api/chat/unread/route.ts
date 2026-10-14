// GET /api/chat/unread?id=... — jumlah balasan admin yang belum dibaca
// pengunjung. Dipakai widget saat panel TERTUTUP untuk badge notifikasi
// (jauh lebih murah daripada menarik seluruh riwayat).
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id") || "";
    const conv = await db.chatConversation.findUnique({ where: { id } });
    if (!conv) return Response.json({ ok: false, count: 0 }, { status: 404 });
    const count = await db.chatMessage.count({
      where: { conversationId: id, sender: "admin", dibacaPengunjung: false },
    });
    return Response.json({ ok: true, count });
  } catch (err) {
    console.error("[chat/unread]", err);
    return Response.json({ error: "Gagal menghitung pesan." }, { status: 500 });
  }
}
