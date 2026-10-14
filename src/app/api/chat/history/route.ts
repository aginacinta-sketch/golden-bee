import { NextRequest } from "next/server";
import { ambilRiwayat, hitungPesan } from "@/lib/chatServer";
import { isAdminRequest, json, unauthorized, badRequest } from "@/lib/admin";

/** GET /api/chat/history?conversationId — riwayat + total percakapan. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const conversationId = (req.nextUrl.searchParams.get("conversationId") ?? "").trim().slice(0, 64);
  if (!conversationId) return badRequest("conversationId wajib diisi.");
  const [messages, total] = await Promise.all([ambilRiwayat(conversationId), hitungPesan(conversationId)]);
  return json({ ok: true, messages, total });
}
