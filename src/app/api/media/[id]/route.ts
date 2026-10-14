import { NextRequest } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// Sajikan isi media (gambar/video)
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const media = await db.media.findUnique({ where: { id } });
    if (!media) return new Response("Media tidak ditemukan", { status: 404 });

    const buffer = Buffer.from(media.data, "base64");
    const total = buffer.length;
    const baseHeaders: Record<string, string> = {
      "Content-Type": media.mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    // Dukungan Range untuk pemutaran video
    const range = req.headers.get("range");
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        let start = match[1] ? parseInt(match[1], 10) : 0;
        let end = match[2] ? parseInt(match[2], 10) : total - 1;
        if (isNaN(start) || start < 0) start = 0;
        if (isNaN(end) || end >= total) end = total - 1;
        if (start > end) start = 0;
        const chunk = buffer.subarray(start, end + 1);
        return new Response(new Uint8Array(chunk), {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Content-Length": String(chunk.length),
          },
        });
      }
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(total) },
    });
  } catch (e) {
    return new Response("Gagal memuat media", { status: 500 });
  }
}
