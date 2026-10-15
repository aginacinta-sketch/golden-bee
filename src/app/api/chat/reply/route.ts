import { NextRequest } from "next/server";
import { getSettingsMap } from "@/lib/admin";
import { sisipPesan, validasiPesan } from "@/lib/chatServer";
import { isAdminRequest, json, unauthorized, badRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/reply — balasan admin. Nama pengirim memakai nama pemasok
 * (supplierName) agar pengunjung melihat balasan dari brand, bukan "Admin".
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await req.json().catch(() => null)) as
    | { conversationId?: string; message?: string; text?: string; clientTmpId?: string }
    | null;
  const conversationId = (body?.conversationId ?? "").trim().slice(0, 64);
  const message = validasiPesan(body?.message || body?.text);
  if (!conversationId || !message) return badRequest("Balasan tidak lengkap.");

  const settings = await getSettingsMap();
  const name = (settings.supplierName || "Admin").trim().slice(0, 60) || "Admin";
  const row = await sisipPesan({ conversationId, sender: "admin", name, message });

  return json({
    ok: true,
    row,
    message: {
      id: row.id,
      conversationId: row.conversationId,
      sender: "admin",
      text: row.message,
      createdAt: row.createdAt,
      clientTmpId: body?.clientTmpId,
    },
  });
}
