import { NextRequest } from "next/server";
import { aturMengetikAdmin, aturMengetikPengunjung } from "@/lib/chatPresence";
import { validasiVisitorId } from "@/lib/chatServer";
import { badRequest, json } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** POST /api/chat/typing — status mengetik pengunjung / admin (TTL 4 detik). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        visitorId?: string;
        conversationId?: string;
        typing?: boolean;
        aktif?: boolean;
        side?: string;
      }
    | null;

  const id = validasiVisitorId(body?.conversationId || body?.visitorId);
  if (!id) return badRequest("ID percakapan wajib diisi.");

  const aktif = body?.aktif !== undefined ? !!body.aktif : !!body?.typing;
  if (body?.side === "admin") {
    aturMengetikAdmin(id, aktif);
  } else {
    aturMengetikPengunjung(id, aktif);
  }

  return json({ ok: true });
}
