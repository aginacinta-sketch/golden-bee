import { NextRequest } from "next/server";
import { sisipPesan, validasiNama, validasiPesan, validasiVisitorId } from "@/lib/chatServer";
import { badRequest, json } from "@/lib/admin";

/** POST /api/chat/send — kirim pesan pengunjung (conversationId = visitorId). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { visitorId?: string; name?: string; message?: string }
    | null;
  const visitorId = validasiVisitorId(body?.visitorId);
  const name = validasiNama(body?.name);
  const message = validasiPesan(body?.message);
  if (!visitorId || !name || !message) return badRequest("Pesan tidak lengkap.");
  const row = await sisipPesan({ conversationId: visitorId, sender: "visitor", name, message });
  return json({ ok: true, row });
}
