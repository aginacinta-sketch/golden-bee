import { NextRequest } from "next/server";
import { getPublicSettings, setSettings, bumpSyncVersion, isAdminRequest, unauthorized } from "@/lib/admin";
import { sinkronAktif, pushToCentral, maybePullThrottled } from "@/lib/settings-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pada salinan ter-deploy: kikis penarikan setelan terbaru dari pusat
    // (fire-and-forget, maks sekali per menit) agar perubahan dari URL
    // preview maupun URL publik saling mengikuti tanpa Publish ulang.
    void maybePullThrottled();
    const settings = await getPublicSettings();
    return Response.json(settings);
  } catch (e) {
    return Response.json({ error: "Gagal memuat pengaturan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k.startsWith("admin")) continue; // proteksi kunci admin
      clean[k] = String(v ?? "");
    }
    await setSettings(clean);
    // Tandai perubahan dengan versi baru, lalu (bila ini salinan ter-deploy
    // dengan sinkronisasi aktif) kirim ke pusat data agar tidak hilang saat
    // instans publik didaur ulang platform.
    await bumpSyncVersion();
    let statusSinkron = "nonaktif";
    if (await sinkronAktif()) {
      const hasil = await pushToCentral();
      statusSinkron = hasil.ok ? "terkirim" : "antre";
    }
    const settings = await getPublicSettings();
    return Response.json(settings, { headers: { "x-sync-status": statusSinkron } });
  } catch (e) {
    return Response.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
