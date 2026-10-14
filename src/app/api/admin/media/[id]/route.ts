import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { id } = await params;
  try {
    await db.media.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Gagal menghapus media" }, { status: 500 });
  }
}
