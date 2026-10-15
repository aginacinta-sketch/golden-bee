import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sisipPesan, validasiNama, validasiPesan, validasiVisitorId } from "@/lib/chatServer";
import { badRequest, json } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** POST /api/chat/send — kirim pesan pengunjung */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        visitorId?: string;
        conversationId?: string;
        name?: string;
        nama?: string;
        message?: string;
        text?: string;
        clientTmpId?: string;
      }
    | null;

  const conversationId = validasiVisitorId(body?.conversationId || body?.visitorId);
  const message = validasiPesan(body?.message || body?.text);
  if (!conversationId || !message) return badRequest("Pesan tidak lengkap.");

  let name = validasiNama(body?.name || body?.nama);
  if (!name || name === "Pengunjung") {
    // 1. Cek Setting tersimpan untuk percakapan ini
    const savedSetting = await db.setting.findUnique({
      where: { key: `chat_name_${conversationId}` },
    });
    if (savedSetting?.value) {
      name = savedSetting.value;
    }
  }

  if (!name || name === "Pengunjung") {
    // 2. Cari nama yang pernah dipakai sebelumnya di percakapan ini (selain Pengunjung)
    const prev = await db.chatMessage.findFirst({
      where: { conversationId, sender: "visitor", NOT: { name: "Pengunjung" } },
      orderBy: { createdAt: "desc" },
      select: { name: true },
    });
    if (prev?.name) {
      name = prev.name;
    }
  }

  if (!name) name = "Pengunjung";

  // Bila nama pengunjung valid dan bukan bawaan, simpan ke Setting & perbaiki pesan lama
  if (name !== "Pengunjung") {
    await db.setting.upsert({
      where: { key: `chat_name_${conversationId}` },
      update: { value: name },
      create: { key: `chat_name_${conversationId}`, value: name },
    }).catch(() => {});

    await db.chatMessage.updateMany({
      where: { conversationId, sender: "visitor", name: "Pengunjung" },
      data: { name },
    }).catch(() => {});
  }

  const row = await sisipPesan({ conversationId, sender: "visitor", name, message });
  return json({
    ok: true,
    row,
    message: {
      id: row.id,
      conversationId: row.conversationId,
      sender: "pengunjung",
      text: row.message,
      createdAt: row.createdAt,
      clientTmpId: body?.clientTmpId,
    },
  });
}
