import { NextRequest } from "next/server";
import { aturMengetikPengunjung } from "@/lib/chatPresence";
import { validasiVisitorId } from "@/lib/chatServer";
import { badRequest, json } from "@/lib/admin";

/** POST /api/chat/typing — status mengetik pengunjung (TTL 4 detik). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { visitorId?: string; typing?: boolean }
    | null;
  const visitorId = validasiVisitorId(body?.visitorId);
  if (!visitorId) return badRequest("visitorId wajib diisi.");
  aturMengetikPengunjung(visitorId, !!body?.typing);
  return json({ ok: true });
}
