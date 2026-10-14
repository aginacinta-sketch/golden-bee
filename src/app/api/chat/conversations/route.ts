import { NextRequest } from "next/server";
import { daftarPercakapan } from "@/lib/chatServer";
import { daftarPengunjungMengetik } from "@/lib/chatPresence";
import { isAdminRequest, json, unauthorized } from "@/lib/admin";

/**
 * GET /api/chat/conversations — daftar percakapan untuk panel admin
 * (nama, pesan terakhir, waktu, jumlah belum dibaca) + daftar pengunjung
 * yang sedang mengetik.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const [conversations, typingVisitor] = await Promise.all([
    daftarPercakapan(),
    Promise.resolve(daftarPengunjungMengetik()),
  ]);
  return json({ conversations, typingVisitor });
}
