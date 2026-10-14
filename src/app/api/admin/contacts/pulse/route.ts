import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, json, unauthorized } from "@/lib/admin";

/**
 * GET /api/admin/contacts/pulse — "denyut" ringan untuk notifikasi pesan
 * kontak masuk (hook use-notifikasi-pesan, polling tiap 15 detik).
 * Mengembalikan jumlah TOTAL permintaan kontak + pengirim TERBARU; hook
 * membandingkan dengan basis sebelumnya dan menampilkan toast + dentang
 * bila jumlahnya bertambah. Ringan: hanya count + 1 baris terakhir.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const [total, terbaru] = await Promise.all([
    db.contactRequest.count(),
    db.contactRequest.findFirst({
      orderBy: { createdAt: "desc" },
      select: { name: true, productName: true },
    }),
  ]);
  return json({
    total,
    terbaru: terbaru
      ? { nama: terbaru.name, produk: terbaru.productName }
      : null,
  });
}
