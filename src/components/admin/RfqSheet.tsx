"use client";

import { useMemo } from "react";
import { parseTagsClient } from "@/lib/clientHelpers";
import type { ContactRequest, SettingsMap } from "@/lib/types";

interface Props {
  request: ContactRequest;
  settings: SettingsMap;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Kotak centang untuk dicetak (kotak kosong ala formulir). */
function Box() {
  return <span className="me-1.5 inline-block h-3 w-3 shrink-0 border border-slate-500 align-[-1px]" aria-hidden />;
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return <h3 className="mb-1.5 mt-5 text-[13px] font-bold text-slate-900">{n}. {title}</h3>;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-1 py-[3px] sm:grid-cols-[215px_14px_1fr] sm:items-baseline">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="hidden text-slate-400 sm:block">:</p>
      <p className="break-words text-xs text-slate-800">{value || "-"}</p>
    </div>
  );
}

function CheckRow({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="grid grid-cols-1 py-[3px] sm:grid-cols-[215px_14px_1fr] sm:items-baseline">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="hidden text-slate-400 sm:block">:</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-700">
        {options.map((o) => (
          <span key={o} className="inline-flex items-center gap-1.5">
            <Box /> {o}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Lembar Permintaan Penawaran Resmi (RFQ record) — pratinjau di layar & versi cetak.
 * Aksen warna mengikuti warna header situs (--bp-header): bar atas & judul (tanpa garis tepi).
 */
export function RfqSheet({ request: m, settings }: Props) {
  const headerColor = "var(--bp-header, #0B3B2E)";
  const accentDark = "var(--bp-accent-dark, #0B3B2E)";
  const supplierName = settings.supplierName || "Supplier";
  const tags = parseTagsClient(settings.tags);

  const inqId = `inq-${new Date(m.createdAt).getTime()}`;
  const waktu = (() => {
    const d = new Date(m.createdAt);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  // Waktu pembuatan lembar — dihitung sekali per mount agar stabil saat re-render.
  const generatedAt = useMemo(() => {
    const d = new Date();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}`;
  }, []);

  const statusMap: Record<string, { label: string; className: string }> = {
    baru: { label: "BARU", className: "font-bold text-red-600" },
    dibaca: { label: "DIBACA", className: "font-bold text-slate-500" },
    selesai: { label: "SELESAI", className: "font-bold text-green-600" },
  };
  const st = statusMap[m.status] || statusMap.baru;

  return (
    <div
      className="bg-white text-slate-800"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}
    >
      {/* Bar warna header di bagian atas lembar (tanpa garis tepi) */}
      <div className="h-2.5 w-full" style={{ backgroundColor: headerColor }} />
      <div className="bg-white">
        <div className="px-5 py-5 sm:px-8">
          {/* Kop perusahaan */}
          <div className="flex items-start gap-4">
            {settings.supplierLogo ? (
              <img
                src={settings.supplierLogo}
                alt={`Logo ${supplierName}`}
                className="h-16 w-16 shrink-0 rounded-xl border object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-slate-900">{supplierName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {settings.supplierCategory && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentDark }}>
                    {settings.supplierCategory}
                  </span>
                )}
                {tags.map((t) => (
                  <span key={t.label} className="text-[10px] font-semibold" style={{ color: accentDark }}>
                    · {t.label}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">{settings.supplierDesc}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {settings.supplierAddress}
                {settings.whatsapp ? ` · WhatsApp: +${settings.whatsapp.replace(/[^0-9]/g, "")}` : ""}
                {settings.contactEmail ? ` · Email: ${settings.contactEmail}` : ""}
              </p>
            </div>
          </div>

          <hr className="my-5 border-slate-200" />

          {/* Judul dokumen + kotak ID */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: headerColor }}>
                Lembar Permintaan Penawaran Resmi
              </h2>
              <p className="text-xs text-slate-500">Official Purchase Inquiry &amp; RFQ Record</p>
            </div>
            <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed">
              <p>
                <span className="text-slate-400">ID: </span>
                <span className="font-mono text-slate-700">{inqId}</span>
              </p>
              <p>
                <span className="text-slate-400">Waktu: </span>
                <span className="text-slate-700">{waktu}</span>
              </p>
              <p>
                <span className="text-slate-400">Status: </span>
                <span className={st.className}>{st.label}</span>
              </p>
            </div>
          </div>

          {/* 1. Informasi calon pembeli */}
          <SectionTitle n={1} title="INFORMASI CALON PEMBELI (BUYER)" />
          <Row label="Nama Lengkap" value={m.name} />
          <Row label="Perusahaan / Institusi" value={m.company} />
          <Row label="Email Bisnis" value={m.email} />
          <Row label="Nomor Telepon / WhatsApp" value={m.phone} />

          {/* 2. Spesifikasi produk */}
          <SectionTitle n={2} title="SPESIFIKASI PRODUK & VOLUME KEBUTUHAN" />
          <Row label="Produk yang Diminati" value={m.productName} />
          <Row label="Estimasi Jumlah Kebutuhan" value={m.quantity ? `${m.quantity}${m.unit ? ` ${m.unit}` : ""}` : null} />
          <Row label="Satuan Pemesanan" value={m.unit} />

          {/* 3. Rincian permintaan */}
          <SectionTitle n={3} title="RINCIAN PERMINTAAN PENAWARAN & CATATAN KHUSUS" />
          <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-3">
            <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">{m.message || "-"}</p>
          </div>

          {/* 4. Catatan tindak lanjut internal */}
          <SectionTitle n={4} title="CATATAN TINDAK LANJUT INTERNAL SUPPLIER" />
          <div className="grid gap-0.5">
            <CheckRow label="Pemeriksaan Ketersediaan Stok" options={["Stok Cukup", "Pre-Order", "Stok Tidak Cukup"]} />
            <CheckRow label="Kalkulasi Harga & Syarat Pengiriman" options={["FOB", "CIF", "Franco Gudang Pembeli"]} />
            <CheckRow label="Kontak Balik ke Calon Pembeli" options={["Telah dihubungi via WA", "Email Penawaran Terkirim"]} />
            <Row label="Pencatatan / Admin Bertugas" value="________________________" />
          </div>

          {/* Tanda tangan — dua kolom simetris: label rata tengah di atas garis, ruang ttd, garis penuh, jabatan di tengah (tidak terpotong halaman saat cetak) */}
          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 break-inside-avoid text-xs sm:grid-cols-2">
            <div className="flex flex-col">
              <p className="text-center font-semibold text-slate-700">Diterima &amp; Diverifikasi oleh:</p>
              <div className="mt-16 w-full border-t border-slate-400 pt-1 text-center text-slate-500">
                (Staf Administrasi)
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-center font-semibold text-slate-700">Bagian Penjualan &amp; Ekspor:</p>
              <div className="mt-16 w-full border-t border-slate-400 pt-1 text-center text-slate-500">
                (Manajer Pemasaran)
              </div>
            </div>
          </div>
        </div>

        {/* Kaki lembar */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-2.5 text-[10px] text-slate-400 sm:px-8">
          Lembar ini dihasilkan secara otomatis oleh Portal B2B {supplierName} pada {generatedAt}
        </div>
      </div>
    </div>
  );
}
