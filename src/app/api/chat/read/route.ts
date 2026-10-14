// POST /api/chat/read — menandai pesan sudah dibaca.
// Body: { conversationId, side: "admin" | "pengunjung" }
// - side=admin      → pesan PENGUNJUNG ditandai dibaca admin.
// - side=pengunjung → balasan ADMIN ditandai dibaca pengunjung.
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      side?: string;
    };
    const conversationId = String(body.conversationId || "");
    const conv = await db.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) {
      return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    }
    if (body.side === "admin") {
      await db.chatMessage.updateMany({
        where: { conversationId, sender: "pengunjung", dibacaAdmin: false },
        data: { dibacaAdmin: true },
      });
    } else {
      await db.chatMessage.updateMany({
        where: { conversationId, sender: "admin", dibacaPengunjung: false },
        data: { dibacaPengunjung: true },
      });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[chat/read]", err);
    return Response.json({ error: "Gagal menandai dibaca." }, { status: 500 });
  }
}
