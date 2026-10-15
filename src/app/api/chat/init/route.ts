import { NextRequest } from "next/server";
import { ambilRiwayat, validasiNama, validasiVisitorId } from "@/lib/chatServer";
import { badRequest, json } from "@/lib/admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/** POST /api/chat/init — inisialisasi / gabung percakapan pengunjung */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { visitorId?: string; conversationId?: string; name?: string; nama?: string }
    | null;

  const rawName = body?.name || body?.nama;
  const name = validasiNama(rawName);
  if (!name) return badRequest("Nama pengunjung wajib diisi.");

  let conversationId = validasiVisitorId(body?.conversationId || body?.visitorId);
  if (!conversationId) {
    conversationId = "vis-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  // Simpan nama pengunjung di database dan perbaiki pesan lama jika ada
  try {
    const { db } = await import("@/lib/db");
    await db.setting.upsert({
      where: { key: `chat_name_${conversationId}` },
      update: { value: name },
      create: { key: `chat_name_${conversationId}`, value: name },
    });
    await db.chatMessage.updateMany({
      where: { conversationId, sender: "visitor" },
      data: { name },
    });
  } catch {
    // abaikan kesalahan non-fatal saat simpan nama
  }

  const messages = await ambilRiwayat(conversationId);
  return json({
    ok: true,
    conversationId,
    visitorId: conversationId,
    name,
    nama: name,
    messages,
  });
}
