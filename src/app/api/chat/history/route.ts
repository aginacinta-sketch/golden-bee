import { NextRequest } from "next/server";
import { ambilRiwayat, hitungPesan, pesanSejak, validasiVisitorId } from "@/lib/chatServer";
import { adminSedangMengetik, pengunjungMengetik } from "@/lib/chatPresence";
import { badRequest, json } from "@/lib/admin";
import type { PesanChat } from "@/lib/chatClient";

export const dynamic = "force-dynamic";

/** GET /api/chat/history?id=...&since=... — riwayat percakapan pengunjung / admin */
export async function GET(req: NextRequest) {
  const conversationId = validasiVisitorId(
    req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("conversationId")
  );
  if (!conversationId) return badRequest("conversationId wajib diisi.");

  const since = Number(req.nextUrl.searchParams.get("since") ?? "0");
  const [rawRows, total] = await Promise.all([
    since > 0 ? pesanSejak(conversationId, since) : ambilRiwayat(conversationId),
    hitungPesan(conversationId),
  ]);

  const messages: PesanChat[] = rawRows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    sender: r.sender === "admin" ? "admin" : "pengunjung",
    text: r.message,
    createdAt: r.createdAt,
  }));

  const visitorName = rawRows.find((r) => r.sender === "visitor")?.name || "Pengunjung";
  const lastId = messages.length
    ? Math.max(...messages.map((m) => Number(m.id) || m.createdAt))
    : since;

  return json({
    ok: true,
    nama: visitorName,
    name: visitorName,
    messages,
    total,
    adminMengetik: adminSedangMengetik(conversationId),
    pengunjungMengetik: pengunjungMengetik(conversationId),
    dibacaOlehAdmin: true,
    lastId,
  });
}
