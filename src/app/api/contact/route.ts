import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/admin";

// Kirim permintaan kontak ke supplier (publik)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name) return badRequest("Nama wajib diisi.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Alamat email tidak valid.");
    if (!message) return badRequest("Pesan wajib diisi.");

    const item = await db.contactRequest.create({
      data: {
        name,
        email,
        phone: String(body.phone ?? ""),
        company: String(body.company ?? ""),
        subject: String(body.subject ?? ""),
        message,
        productId: String(body.productId ?? ""),
        productName: String(body.productName ?? ""),
        quantity: String(body.quantity ?? ""),
        unit: String(body.unit ?? ""),
      },
    });
    return Response.json({ ok: true, id: item.id }, { status: 201 });
  } catch (e) {
    return Response.json({ error: "Gagal mengirim permintaan" }, { status: 500 });
  }
}
