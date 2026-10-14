// GET /api/chat/health — pemeriksaan kesehatan live chat.
// Karena livechat kini hidup DI DALAM proses Next.js (Task 52), endpoint ini
// selalu sehat bila situs itu sendiri sehat — tidak ada proses kedua yang
// bisa mati saat publish.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "chat-next", waktu: Date.now() });
}
