import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, unauthorized } from "@/lib/admin";
import { serializeModel } from "@/lib/serialize";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Statistik ringkasan untuk dashboard admin
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();

  const now = new Date();
  const awalHariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const awal7Hari = new Date(awalHariIni);
  awal7Hari.setDate(awal7Hari.getDate() - 6);

  const [produkTotal, produkAktif, produkUnggulan, testimoniTotal, testimoniTampil, mediaAgg, semuaPesan, pesanTerbaru] =
    await Promise.all([
      db.product.count(),
      db.product.count({ where: { active: true } }),
      db.product.count({ where: { active: true, featured: true } }),
      db.testimonial.count(),
      db.testimonial.count({ where: { visible: true } }),
      db.media.aggregate({ _count: { _all: true }, _sum: { size: true } }),
      // Data ringan: hanya kolom yang dibutuhkan untuk agregasi
      db.contactRequest.findMany({ select: { createdAt: true, status: true, productName: true } }),
      db.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const statusCount = { baru: 0, dibaca: 0, selesai: 0 };
  for (const p of semuaPesan) {
    if (p.status === "baru" || p.status === "dibaca" || p.status === "selesai") statusCount[p.status]++;
  }

  // Seri jumlah pesan per hari — 7 hari terakhir termasuk hari ini
  const perHari = [];
  for (let i = 0; i < 7; i++) {
    const mulai = new Date(awal7Hari);
    mulai.setDate(awal7Hari.getDate() + i);
    const akhir = new Date(mulai);
    akhir.setDate(mulai.getDate() + 1);
    perHari.push({
      label: HARI[mulai.getDay()],
      tanggal: `${mulai.getDate()} ${BULAN[mulai.getMonth()]}`,
      jumlah: semuaPesan.filter((p) => p.createdAt >= mulai && p.createdAt < akhir).length,
    });
  }

  // Produk paling sering diminta pengunjung (top 5)
  const hitung = new Map<string, number>();
  for (const p of semuaPesan) {
    const nama = p.productName.trim();
    if (!nama) continue;
    hitung.set(nama, (hitung.get(nama) || 0) + 1);
  }
  const topProduk = Array.from(hitung.entries())
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama))
    .slice(0, 5);

  return Response.json({
    produk: { total: produkTotal, aktif: produkAktif, unggulan: produkUnggulan },
    pesan: {
      total: semuaPesan.length,
      ...statusCount,
      hariIni: semuaPesan.filter((p) => p.createdAt >= awalHariIni).length,
      perHari,
      topProduk,
    },
    testimoni: { total: testimoniTotal, tampil: testimoniTampil },
    media: { total: mediaAgg._count._all ?? 0, ukuran: mediaAgg._sum.size ?? 0 },
    pesanTerbaru: pesanTerbaru.map(serializeModel),
  });
}
