import { NextRequest } from "next/server";

/**
 * Konversi link share Google Maps menjadi URL embed yang dapat ditampilkan
 * dalam iframe (output=embed).
 *
 * Mendukung:
 * - Link share/lokasi: https://maps.app.goo.gl/..., https://goo.gl/maps/...,
 *   https://www.google.com/maps/place/..., /maps/search/..., /maps?q=...
 * - Link embed: https://www.google.com/maps/embed?pb=... (dikembalikan apa adanya)
 *
 * Catatan penting: Google kadang mengalihkan permintaan server ke halaman
 * deteksi bot `google.com/sorry/...`. URL asli tetap bisa diperoleh dari
 * parameter `continue` pada halaman tersebut — tanpa ini, parameter `q`
 * di URL sorry berisi token base64 sehingga peta menampilkan lokasi salah.
 *
 * Keamanan: hanya host Google Maps yang diizinkan (cegah SSRF); hasil konversi
 * selalu berupa URL embed resmi Google (output=embed). Hasil di-cache di memori
 * dengan TTL agar hasil basi tidak persisten selamanya.
 */

const ALLOWED_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "maps.google.com", "m.google.com"]);
const CACHE = new Map<string, { url: string; at: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit

function isAllowed(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    if (
      (host === "google.com" || host === "www.google.com" || host.endsWith(".google.com")) &&
      u.pathname.toLowerCase().startsWith("/maps")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Q berupa token base64 (bukan query manusia)? cth: EgQvOfJ3GOb3_9UG... */
function isDataToken(q: string): boolean {
  return q.length >= 32 && !q.includes(" ") && /^[A-Za-z0-9_\-]+$/.test(q);
}

/** Coba bangun URL embed dari sebuah URL Google Maps (tanpa network). */
function buildEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Sudah berupa link embed -> pakai apa adanya
    if (host.endsWith("google.com") && (u.pathname.includes("/maps/embed") || u.searchParams.get("output") === "embed")) {
      return url;
    }
    // Koordinat marker: !3d<lat>!4d<lng> (paling akurat)
    const marker = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (marker) return `https://www.google.com/maps?q=${marker[1]},${marker[2]}&output=embed`;
    // Koordinat viewport: @lat,lng[,zoom] — zoom WAJIB integer (Google menolak
    // desimal dengan HTTP 400, cth. z=16.5 dari link share @...,16.5z)
    const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) {
      const z = url.match(/,(\d+(?:\.\d+)?)z/);
      const zoom = z ? `&z=${Math.max(1, Math.floor(parseFloat(z[1])))}` : "";
      return `https://www.google.com/maps?q=${at[1]},${at[2]}${zoom}&output=embed`;
    }
    // Nama tempat: /maps/place/<Nama>/...
    const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
    if (place) {
      const name = decodeURIComponent(place[1]).replace(/\+/g, " ");
      return `https://www.google.com/maps?q=${encodeURIComponent(name)}&output=embed`;
    }
    // Kata kunci pencarian: /maps/search/<kata kunci>/...
    const search = u.pathname.match(/\/maps\/search\/([^/]+)/);
    if (search) {
      const term = decodeURIComponent(search[1]).replace(/\+/g, " ");
      return `https://www.google.com/maps?q=${encodeURIComponent(term)}&output=embed`;
    }
    // Parameter q (mis. /maps?q=Monas) — tolak token base64 hasil halaman sorry
    const q = u.searchParams.get("q");
    if (q && !isDataToken(q)) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    return null;
  } catch {
    return null;
  }
}

/**
 * Ikuti redirect short-link (maps.app.goo.gl) untuk mendapatkan URL final.
 * Bila Google mengalihkan ke halaman deteksi bot /sorry/, URL asli diambil
 * dari parameter `continue` (berisi link place lengkap dengan koordinat).
 */
async function resolveShortLink(raw: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(raw, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MitraDagang/1.0; katalog B2B)" },
    });
    let finalUrl = res.url || null;
    // Halaman sorry = deteksi bot; URL tempat asli ada di param `continue`
    if (finalUrl) {
      try {
        const fu = new URL(finalUrl);
        if (fu.hostname.toLowerCase().endsWith("google.com") && fu.pathname.startsWith("/sorry")) {
          const lanjut = fu.searchParams.get("continue");
          if (lanjut && /^https:\/\//i.test(lanjut)) finalUrl = lanjut;
        }
      } catch {
        /* biarkan finalUrl apa adanya */
      }
    }
    return finalUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  if (!raw || raw.length > 2048) {
    return Response.json({ error: "URL tidak valid" }, { status: 400 });
  }
  if (!isAllowed(raw)) {
    return Response.json({ error: "Hanya link Google Maps yang didukung" }, { status: 400 });
  }

  // Cache hit (dengan TTL)
  const cached = CACHE.get(raw);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return Response.json({ embedUrl: cached.url });
  if (cached) CACHE.delete(raw);

  // 1) Coba konversi langsung tanpa network (URL place biasanya sudah memuat koordinat/nama)
  let embedUrl = buildEmbed(raw);

  // 2) Bila gagal (mis. short link), ikuti redirect lalu konversi dari URL final
  if (!embedUrl) {
    const finalUrl = await resolveShortLink(raw);
    embedUrl = finalUrl ? buildEmbed(finalUrl) : null;
  }

  if (embedUrl) {
    CACHE.set(raw, { url: embedUrl, at: Date.now() });
    if (CACHE.size > 200) {
      const oldest = CACHE.keys().next().value;
      if (oldest) CACHE.delete(oldest);
    }
    return Response.json({ embedUrl });
  }

  return Response.json(
    { error: "Tidak dapat membaca link peta. Gunakan link share atau embed Google Maps." },
    { status: 422 }
  );
}
