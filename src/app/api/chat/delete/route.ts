import { NextRequest } from "next/server";
import { hapusPercakapan } from "@/lib/chatServer";
import { isAdminRequest, json, unauthorized } from "@/lib/admin";

/**
 * POST /api/chat/delete — hapus percakapan: {conversationId} untuk SATU,
 * {all: true} untuk SEMUA. Penghapusan permanen (satu sumber data bersama
 * dengan chat-service).
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await req.json().catch(() => null)) as
    | { conversationId?: string; all?: boolean }
    | null;
  const conversationId = (body?.conversationId ?? "").trim().slice(0, 64);
  await hapusPercakapan(body?.all ? undefined : conversationId || undefined);
  return json({ ok: true });
}
