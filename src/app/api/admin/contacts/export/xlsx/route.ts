import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSettingsMap, isAdminRequest, unauthorized } from "@/lib/admin";
import { STATUS_COLOR, STATUS_LABEL, fmtDate, fmtTime, kebutuhan, safeHex, stamp } from "@/lib/report";

// GET /api/admin/contacts/export/xlsx — unduh laporan seluruh pesan masuk (Excel)
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

  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal B2B";
  wb.created = now;
  const ws = wb.addWorksheet("Laporan Pesan", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 4 }],
  });

  ws.columns = [
    { key: "no", width: 5 },
    { key: "tanggal", width: 12 },
    { key: "waktu", width: 8 },
    { key: "nama", width: 16 },
    { key: "email", width: 26 },
    { key: "telepon", width: 16 },
    { key: "perusahaan", width: 20 },
    { key: "subjek", width: 18 },
    { key: "produk", width: 20 },
    { key: "kebutuhan", width: 12 },
    { key: "status", width: 10 },
    { key: "pesan", width: 55 },
  ];

  const thin = { style: "thin" as const, color: { argb: "FFE2E8F0" } };
  const borders = { top: thin, left: thin, bottom: thin, right: thin };

  // ===== Baris judul & ringkasan =====
  ws.mergeCells("A1:L1");
  const t1 = ws.getCell("A1");
  t1.value = `LAPORAN PESAN MASUK — ${supplierName}`;
  t1.font = { bold: true, size: 14, color: { argb: "FF1E293B" } };
  t1.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 22;

  ws.mergeCells("A2:L2");
  const t2 = ws.getCell("A2");
  t2.value = `Detail Permintaan Kontak (Contact Inquiry Report) • Dihasilkan: ${fmtDate(now)}, ${fmtTime(now)} • Total: ${counts.total} pesan (Baru: ${counts.baru} • Dibaca: ${counts.dibaca} • Selesai: ${counts.selesai})`;
  t2.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
  t2.alignment = { vertical: "middle", horizontal: "left" };

  // ===== Baris kepala tabel (baris 4) =====
  const headerRow = ws.getRow(4);
  headerRow.values = [
    "No",
    "Tanggal",
    "Waktu",
    "Nama",
    "Email",
    "Telepon/WA",
    "Perusahaan",
    "Subjek",
    "Produk Diminta",
    "Kebutuhan",
    "Status",
    "Isi Pesan",
  ];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerBg.toUpperCase()}` } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = borders;
  });
  headerRow.height = 20;

  // ===== Baris data =====
  items.forEach((m, i) => {
    const row = ws.getRow(5 + i);
    row.values = {
      no: i + 1,
      tanggal: fmtDate(new Date(m.createdAt)),
      waktu: fmtTime(new Date(m.createdAt)),
      nama: m.name || "-",
      email: m.email || "-",
      telepon: m.phone || "-",
      perusahaan: m.company || "-",
      subjek: m.subject || "-",
      produk: m.productName || "-",
      kebutuhan: kebutuhan(m.quantity, m.unit),
      status: STATUS_LABEL[m.status] || m.status,
      pesan: m.message || "-",
    };
    row.eachCell((cell, col) => {
      cell.border = borders;
      cell.font = { size: 9, color: { argb: "FF1E293B" } };
      // Kolom tengah: No(1), Tanggal(2), Waktu(3), Kebutuhan(10), Status(11)
      const centered = col === 1 || col === 2 || col === 3 || col === 10 || col === 11;
      cell.alignment = {
        vertical: "top",
        horizontal: centered ? "center" : "left",
        wrapText: col === 12, // isi pesan membungkus
      };
      // Warna status sesuai kategori
      if (col === 11) {
        const c = STATUS_COLOR[m.status] || "1E293B";
        cell.font = { size: 9, bold: true, color: { argb: `FF${c.toUpperCase()}` } };
      }
      // Zebra striping baris genap
      if ((i + 1) % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  });

  // Filter otomatis pada baris kepala tabel
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, 4 + items.length), column: 12 } };

  const buf = await wb.xlsx.writeBuffer();

  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-pesan-${stamp(now)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
