import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SYNC_CONFIG_KEYS } from "@/lib/settings-sync";

// ---------- Default settings (Bahasa Indonesia) ----------
export const DEFAULT_SETTINGS: Record<string, string> = {
  // Identitas situs
  brandPrimary: "mitra",
  brandAccent: "dagang",
  headerColor: "#0B3B2E",
  accentColor: "#84BD00",

  // Profil supplier
  supplierName: "PT SUMBER PANGAN NUSANTARA",
  supplierLogo: "/demo/logo-supplier.jpg",
  supplierFlag: "🇮🇩",
  supplierCountry: "Indonesia",
  supplierAddress: "Jl. Raya Bogor Km 32, Cibinong, Jawa Barat 16912",
  supplierCategory: "Makanan dan Minuman",
  supplierCountryCode: "ID",
  supplierDesc:
    "Kami adalah distributor buah-buahan, sayuran, kacang-kacangan, dan produk agroindustri lainnya seperti \"serat sisal\" dan pemanis alami. Produk kami berkualitas tinggi dengan keragaman yang besar. Kami melayani pemesanan skala kecil hingga kontainer penuh (FCL) dengan pengiriman ke seluruh dunia, didukung sertifikasi ekspor lengkap.",
  tags: JSON.stringify([
    { icon: "handshake", label: "Distributor" },
    { icon: "truck", label: "Grosir" },
    { icon: "globe", label: "Area Pengiriman: Seluruh Dunia" },
  ]),

  // Header profil: badge, QR & statistik
  verified: "1",
  showQr: "1",
  // Link kustom isi QR code (kosong = tautan profil otomatis +via=qr)
  qrCustomUrl: "",
  responseRate: "98%",
  responseTime: "< 2 Jam",

  // Media sosial profil (kosong = ikon disembunyikan)
  socialFacebook: "https://facebook.com/goldenbee.official",
  socialInstagram: "https://instagram.com/goldenbee.official",
  socialTiktok: "https://tiktok.com/@goldenbee.official",
  socialYoutube: "https://youtube.com/@goldenbee.official",

  // Kontak
  contactEmail: "sales@mitradagang.id",
  contactPhone: "+62 21 555 0123",
  whatsapp: "6281234567890",

  // Konten
  aboutTitle: "Tentang Kami",
  aboutText:
    "PT Sumber Pangan Nusantara adalah perusahaan ekspor-impor yang berfokus pada produk pertanian dan makanan olahan Indonesia. Sejak 2009 kami telah memasok lebih dari 500 pembeli di 32 negara, mulai dari retailer, distributor grosir, hingga industri pengolahan makanan. Kami berkomitmen pada kualitas yang konsisten, harga yang kompetitif, dan pengiriman tepat waktu.",

  // Statistik bagian "Tentang Kami" (kosong = statistik disembunyikan)
  expYears: "15+",
  destCountries: "32",
  b2bCustomers: "500+",

  // Peta lokasi "Tentang Kami" — link embed Google Maps (kosong = peta disembunyikan)
  mapEmbedUrl:
    "https://www.google.com/maps?q=Jl.%20Raya%20Bogor%20Km%2032%2C%20Cibinong%2C%20Jawa%20Barat&z=14&output=embed",

  footerText:
    "MitraDagang adalah katalog supplier B2B yang menghubungkan pembeli dengan pemasok terpercaya di Indonesia.",

  // Tampilan toggle
  showWhatsapp: "1",
  showTestimoni: "1",
  showTentang: "1",

  // Auth admin
  adminPassword: "admin123",

  // Kunci akses tautan berkunci panel admin (/?k=KUNCI#admin) — bisa diganti di tab Akun
  adminGateKey: "goldenbee-admin",
};

// Kunci yang tidak boleh bocor ke publik
const PRIVATE_KEYS = new Set(["adminPassword", "adminToken", "adminGateKey"]);

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getPublicSettings(): Promise<Record<string, string>> {
  const map = await getSettingsMap();
  for (const k of PRIVATE_KEYS) delete map[k];
  // Kunci internal sinkronisasi (termasuk rahasia) tidak boleh bocor ke publik
  for (const k of SYNC_CONFIG_KEYS) delete map[k];
  return map;
}

export async function setSettings(obj: Record<string, string>) {
  for (const [key, value] of Object.entries(obj)) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

/** Naikkan penghitung versi setelan — dipakai sinkronisasi last-writer-wins */
export async function bumpSyncVersion(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: "syncVersion" } });
  const n = parseInt(row?.value || "0", 10);
  const versiBaru = Number.isFinite(n) && n > 0 ? n + 1 : 1;
  await db.setting.upsert({
    where: { key: "syncVersion" },
    update: { value: String(versiBaru) },
    create: { key: "syncVersion", value: String(versiBaru) },
  });
  return versiBaru;
}

// ---------- Admin auth ----------
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("x-admin-token") || "";
  if (!token) return false;
  const s = await db.setting.findUnique({ where: { key: "adminToken" } });
  return !!s && s.value === token && s.value.length > 10;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function unauthorized() {
  return Response.json({ error: "Tidak diizinkan. Silakan masuk sebagai admin." }, { status: 401 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

// ---------- Safe JSON parse ----------
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function parseTags(raw: string | null | undefined): { icon: string; label: string }[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
