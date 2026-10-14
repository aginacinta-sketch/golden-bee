import { NextRequest } from "next/server";
import { hitungPesan, pesanSejak, validasiVisitorId } from "@/lib/chatServer";
import { adminSedangMengetik } from "@/lib/chatPresence";
import { badRequest, json } from "@/lib/admin";

/**
 * GET /api/chat/poll?visitorId&since — pesan baru sejak `since` (ms epoch),
 * total pesan (deteksi percakapan dihapus), dan status mengetik admin.
 * Dipanggil berkala (3 detik) oleh widget pengunjung pada jalur HTTP.
 */
export async function GET(req: NextRequest) {
  const visitorId = validasiVisitorId(req.nextUrl.searchParams.get("visitorId"));
  const since = Number(req.nextUrl.searchParams.get("since") ?? "0");
  if (!visitorId) return badRequest("visitorId wajib diisi.");
  if (!Number.isFinite(since) || since < 0) return badRequest("since tidak valid.");
  const [messages, total] = await Promise.all([
    pesanSejak(visitorId, since),
    hitungPesan(visitorId),
  ]);
  return json({
    ok: true,
    messages,
    total,
    adminTyping: adminSedangMengetik(visitorId),
  });
}
