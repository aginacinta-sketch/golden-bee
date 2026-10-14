import { NextRequest } from "next/server";
import { tandaiTerbaca } from "@/lib/chatServer";
import { isAdminRequest, json, unauthorized, badRequest } from "@/lib/admin";

/** POST /api/chat/open — tandai seluruh pesan pengunjung sudah dibaca. */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await req.json().catch(() => null)) as { conversationId?: string } | null;
  const conversationId = (body?.conversationId ?? "").trim().slice(0, 64);
  if (!conversationId) return badRequest("conversationId wajib diisi.");
  await tandaiTerbaca(conversationId);
  return json({ ok: true });
}
