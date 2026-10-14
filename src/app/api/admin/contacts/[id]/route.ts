import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest } from "@/lib/admin";
import { serializeModel } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUS = ["baru", "dibaca", "selesai"];

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const status = String(body.status ?? "");
    if (!VALID_STATUS.includes(status)) return badRequest("Status tidak valid.");
    const item = await db.contactRequest.update({ where: { id }, data: { status } });
    return Response.json(serializeModel(item));
  } catch (e) {
    return Response.json({ error: "Gagal memperbarui status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    await db.contactRequest.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal menghapus pesan" }, { status: 500 });
  }
}
