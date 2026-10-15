import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      side?: string;
    };
    const conversationId = String(body.conversationId || "").trim();
    if (!conversationId) {
      return Response.json({ error: "conversationId wajib diisi." }, { status: 400 });
    }

    const now = BigInt(Date.now());
    if (body.side === "admin") {
      await db.chatMessage.updateMany({
        where: { conversationId, sender: "visitor", readAt: null },
        data: { readAt: now },
      });
    } else {
      await db.chatMessage.updateMany({
        where: { conversationId, sender: "admin", readAt: null },
        data: { readAt: now },
      });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[chat/read]", err);
    return Response.json({ error: "Gagal menandai dibaca." }, { status: 500 });
  }
}
