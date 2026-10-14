import { NextRequest } from "next/server";
import { ambilRiwayat, validasiNama, validasiVisitorId } from "@/lib/chatServer";
import { badRequest, json } from "@/lib/admin";

/** POST /api/chat/init — gabung percakapan pengunjung: ambil seluruh riwayat. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { visitorId?: string; name?: string }
    | null;
  const visitorId = validasiVisitorId(body?.visitorId);
  const name = validasiNama(body?.name);
  if (!visitorId || !name) return badRequest("Identitas pengunjung tidak lengkap.");
  const messages = await ambilRiwayat(visitorId);
  return json({ ok: true, name, messages });
}
