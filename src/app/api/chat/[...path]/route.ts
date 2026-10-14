// Proxy chat: meneruskan panggilan HTTP /api/chat/* dari aplikasi Next.js ke
// layanan chat (mini-service, port 3003).
//
// Mengapa route ini ada:
// Di preview sandbox, query XTransformPort=3003 membuat gateway meneruskan
// request LANGSUNG ke chat-service (tidak pernah menyentuh Next.js). Tapi
// pada deployment published/production (server standalone) tidak ada jaminan
// gateway mendukung XTransformPort — request jatuh ke Next.js dan sebelumnya
// mendapat 404 sehingga livechat "tidak bisa memulai chat". Route ini menjadi
// jalur aman: klien tetap memakai URL yang sama (dengan/tanpa XTransformPort),
// dan bila request sampai ke Next.js, ia diteruskan ke 127.0.0.1:3003.
//
// Task 53: retry internal saat chat-service terkesan mati (ECONNREFUSED).
// Saat publish, OOM-killer bisa mematikan chat-service beberapa detik sampai
// watchdog memulihkannya (±10-20 detik). Alih-alih langsung 502, proxy ini
// mencoba ulang hingga ±12 detik — sebagian besar jendela gangguan tertutup
// tanpa pengunjung merasakan apa pun.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CHAT_SERVICE = "http://127.0.0.1:3003";
const COBA_MAKS = 5; // 5 percobaan
const JEDA_MS = 2000; // jeda antar percobaan → rentang total ±12 dtk

async function teruskan(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${CHAT_SERVICE}/api/chat/${path.join("/")}${url.search}`;

  const headers = new Headers();
  const token = req.headers.get("x-admin-token");
  if (token) headers.set("x-admin-token", token);
  if (req.method === "POST") headers.set("Content-Type", "application/json");
  const body = req.method === "POST" ? await req.text() : undefined;

  // Hanya kegagalan JARINGAN (layanan mati/belum bind) yang diulang —
  // respons HTTP dari chat-service (mis. 401/404) diteruskan apa adanya.
  for (let coba = 0; coba < COBA_MAKS; coba++) {
    try {
      const res = await fetch(target, {
        method: req.method,
        headers,
        body,
        cache: "no-store",
      });
      const teks = await res.text();
      return new NextResponse(teks, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      if (coba < COBA_MAKS - 1) {
        await new Promise((r) => setTimeout(r, JEDA_MS));
      }
    }
  }

  // Layanan chat benar-benar tidak terjangkau — respons jelas, bukan error
  // runtime; klien punya retry sendiri di atas lapisan ini.
  return NextResponse.json(
    { error: "Layanan chat sedang tidak tersedia. Coba beberapa saat lagi." },
    { status: 502 }
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return teruskan(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return teruskan(req, ctx);
}
