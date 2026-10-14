import { NextRequest } from "next/server";
import { aturMengetikAdmin } from "@/lib/chatPresence";
import { isAdminRequest, json, unauthorized, badRequest } from "@/lib/admin";

/** POST /api/chat/typing-admin — status mengetik admin (TTL 4 detik). */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await req.json().catch(() => null)) as
    | { conversationId?: string; typing?: boolean }
    | null;
  const conversationId = (body?.conversationId ?? "").trim().slice(0, 64);
  if (!conversationId) return badRequest("conversationId wajib diisi.");
  aturMengetikAdmin(conversationId, !!body?.typing);
  return json({ ok: true });
}
