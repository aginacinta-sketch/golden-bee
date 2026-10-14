import { NextRequest } from "next/server";
import { isAdminRequest, json, unauthorized } from "@/lib/admin";

/**
 * GET /api/admin/session — cek sesi admin (header x-admin-token).
 * 200 bila token berlaku, 401 bila tidak. Dipakai page.tsx (buka panel
 * langsung bagi admin ber-sesi) dan ChatWidget (deteksi mode admin).
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  return json({ ok: true });
}
