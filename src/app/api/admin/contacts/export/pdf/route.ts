import type { NextRequest } from "next/server";
import PDFDocument from "pdfkit-table";
import { db } from "@/lib/db";
import { getSettingsMap, isAdminRequest, unauthorized } from "@/lib/admin";
import { STATUS_COLOR, STATUS_LABEL, fmtDate, fmtTime, kebutuhan, safeHex, stamp } from "@/lib/report";

// GET /api/admin/contacts/export/pdf — unduh laporan seluruh pesan masuk (PDF, A4 landscape)
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return unauthorized();

  const [items, settings] = await Promise.all([
    db.contactRequest.findMany({ orderBy: { createdAt: "desc" } }),
    getSettingsMap(),
  ]);
  const supplierName = settings.supplierName || "Supplier";
  const headerBg = safeHex(settings.headerColor);
  const now = new Date();

  const counts = {
    total: items.length,
    baru: items.filter((i) => i.status === "baru").length,
    dibaca: items.filter((i) => i.status === "dibaca").length,
    selesai: items.filter((i) => i.status === "selesai").length,
  };

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 30,
    info: { Title: `Laporan Pesan Masuk — ${supplierName}`, Author: supplierName },
  });

  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ===== Kop laporan =====
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text(supplierName);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text("LAPORAN PESAN MASUK — DETAIL PERMINTAAN KONTAK");
  doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("Contact Inquiry Report • dihasilkan otomatis oleh Portal B2B");
  const periode =
    items.length > 0
      ? `${fmtDate(new Date(items[items.length - 1].createdAt))} s.d. ${fmtDate(new Date(items[0].createdAt))}`
      : "-";
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text(
      `Dihasilkan: ${fmtDate(now)}, ${fmtTime(now)}  •  Periode data: ${periode}  •  Total: ${counts.total} pesan (Baru: ${counts.baru} • Dibaca: ${counts.dibaca} • Selesai: ${counts.selesai})`,
    );
  doc.moveDown(1);

  // ===== Tabel data =====
  await doc.table(
    {
      headers: [
        { label: "No", property: "no", width: 24, align: "center", headerAlign: "center", headerColor: headerBg },
        { label: "Tanggal & Waktu", property: "tanggal", width: 64, headerColor: headerBg },
        { label: "Nama", property: "nama", width: 60, headerColor: headerBg },
        { label: "Email", property: "email", width: 96, headerColor: headerBg },
        { label: "Telepon / WA", property: "telepon", width: 68, headerColor: headerBg },
        { label: "Perusahaan", property: "perusahaan", width: 74, headerColor: headerBg },
        { label: "Subjek", property: "subjek", width: 58, headerColor: headerBg },
        { label: "Produk Diminta", property: "produk", width: 74, headerColor: headerBg },
        { label: "Kebutuhan", property: "kebutuhan", width: 52, align: "center", headerAlign: "center", headerColor: headerBg },
        { label: "Status", property: "status", width: 46, align: "center", headerAlign: "center", headerColor: headerBg },
        { label: "Isi Pesan", property: "pesan", width: "*", headerColor: headerBg },
      ],
      data: items.map((m, i) => ({
        no: String(i + 1),
        tanggal: `${fmtDate(new Date(m.createdAt))}\n${fmtTime(new Date(m.createdAt))}`,
        nama: m.name || "-",
        email: m.email || "-",
        telepon: m.phone || "-",
        perusahaan: m.company || "-",
        subjek: m.subject || "-",
        produk: m.productName || "-",
        kebutuhan: kebutuhan(m.quantity, m.unit),
        status: {
          label: (STATUS_LABEL[m.status] || m.status).toUpperCase(),
          options: { color: STATUS_COLOR[m.status] || "0f172a", fontFamily: "Helvetica-Bold" },
        },
        pesan: m.message || "-",
        options: { fontSize: 7.5, color: "1e293b" },
      })),
    },
    {
      padding: 4,
      minRowHeight: 18,
      divider: {
        header: { disabled: false, width: 0.5, opacity: 1, color: "e2e8f0" },
        horizontal: { disabled: false, width: 0.5, opacity: 1, color: "e2e8f0" },
        vertical: { disabled: false, width: 0.5, opacity: 1, color: "e2e8f0" },
      },
    },
  );

  // ===== Nomor halaman (ditulis setelah tabel agar posisi akhir diketahui) =====
  // Catatan: y harus tetap DI DALAM area konten (maxY = tinggi - margin bawah);
  // jika di luar, pdfkit otomatis menambah halaman kosong baru sebelum menulis teks.
  try {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#94a3b8")
        .text(`Halaman ${i - range.start + 1} dari ${range.count}`, 30, doc.page.height - 40, {
          width: doc.page.width - 60,
          align: "right",
          lineBreak: false,
        });
    }
  } catch {
    // buffer halaman mungkin sudah di-flush — nomor halaman dilewati saja
  }

  doc.end();
  const buf = await finished;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-pesan-${stamp(now)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
