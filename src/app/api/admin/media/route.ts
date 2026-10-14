import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized, badRequest } from "@/lib/admin";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

// Unggah media (multipart/form-data, field "files" bisa lebih dari satu)
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return badRequest("Tidak ada berkas yang diunggah.");

    const saved: { id: string; url: string; name: string; type: string; size: number }[] = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return badRequest(`Berkas "${file.name}" melebihi batas 25 MB.`);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "application/octet-stream";
      const type = mime.startsWith("video") ? "video" : "image";
      const media = await db.media.create({
        data: {
          name: file.name || `berkas-${Date.now()}`,
          mimeType: mime,
          type,
          size: buffer.length,
          data: buffer.toString("base64"),
        },
      });
      saved.push({ id: media.id, url: `/api/media/${media.id}`, name: media.name, type, size: media.size });
    }
    return Response.json({ ok: true, files: saved }, { status: 201 });
  } catch (e) {
    return Response.json({ error: "Gagal mengunggah media" }, { status: 500 });
  }
}
