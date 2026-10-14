import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized } from "@/lib/admin";
import { serializeModel } from "@/lib/serialize";

// Daftar permintaan kontak — admin
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const items = await db.contactRequest.findMany({
    where: status && status !== "semua" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(items.map(serializeModel));
}
