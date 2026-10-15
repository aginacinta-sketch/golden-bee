import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) return Response.json({ ok: true, count: 0 });

    const count = await db.chatMessage.count({
      where: { conversationId: id, sender: "admin", readAt: null },
    });
    return Response.json({ ok: true, count });
  } catch (err) {
    console.error("[chat/unread]", err);
    return Response.json({ error: "Gagal menghitung pesan." }, { status: 500 });
  }
}
