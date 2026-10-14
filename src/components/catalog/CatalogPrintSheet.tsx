"use client";

import { formatHarga } from "@/lib/format";
import type { Product, SettingsMap } from "@/lib/types";

/**
 * Lembar cetak katalog lengkap (multi-halaman, A4) — hanya tampil pada media print.
 * Dipicu tombol "Unduh Katalog" di baris filter produk:
 * window.print() -> pilih "Simpan sebagai PDF" untuk mengunduh katalog.
 */

export function CatalogPrintSheet({
  products,
  settings,
}: {
  products: Product[];
  settings: SettingsMap;
}) {
  const tanggal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div data-catalog-print-sheet className="hidden print:block bg-white p-2 text-slate-900">
      {/* Kop: logo + identitas pemasok */}
      <header className="flex items-start justify-between gap-4 border-b-2 border-[var(--bp-accent)] pb-4">
        <div className="flex items-center gap-3">
          {settings.supplierLogo && (
            <img
              src={settings.supplierLogo}
              alt={`Logo ${settings.supplierName}`}
              className="h-14 w-14 rounded-lg border border-slate-200 object-contain"
            />
          )}
          <div>
            <p className="text-lg font-extrabold leading-tight">{settings.supplierName}</p>
            {settings.supplierAddress && (
              <p className="text-xs text-slate-500">{settings.supplierAddress}</p>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-slate-600">
          {settings.contactEmail && <p>{settings.contactEmail}</p>}
          {settings.contactPhone && <p>{settings.contactPhone}</p>}
        </div>
      </header>

      {/* Judul katalog */}
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--bp-accent-dark)]">
            Katalog Produk
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight">Daftar Produk &amp; Layanan</h1>
        </div>
        <p className="shrink-0 text-xs text-slate-500">
          {products.length} produk • {tanggal}
        </p>
      </div>

      {/* Daftar produk (2 kolom, entri tidak terpotong antar halaman) */}
      <div className="mt-4 grid grid-cols-2 gap-x-8">
        {products.map((p) => (
          <CatalogEntry key={p.id} product={p} />
        ))}
      </div>

      {/* Footer lembar cetak */}
      <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400">
        <span>Katalog {settings.supplierName}</span>
        <span>{tanggal}</span>
      </footer>
    </div>
  );
}

/** Entri satu produk pada katalog cetak: gambar + ringkasan. */
function CatalogEntry({ product }: { product: Product }) {
  const img = product.images?.[0] || "";
  const harga =
    product.priceMin != null || product.priceMax != null
      ? formatHarga(product.priceMin, product.priceMax, product.unit)
      : "Hubungi kami";

  return (
    <article className="break-inside-avoid flex gap-3 border-b border-slate-100 py-3">
      {img ? (
        <img
          src={img}
          alt={product.name}
          className="h-20 w-20 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-slate-200 text-[9px] text-slate-300">
          Tanpa foto
        </div>
      )}
      <div className="min-w-0 flex-1">
        {product.category && (
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--bp-accent-dark)]">
            {product.category}
          </p>
        )}
        <h2 className="mt-0.5 text-sm font-bold leading-snug">{product.name}</h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-800">{harga}</p>
        {(product.minOrder || product.unit) && (
          <p className="text-[10px] text-slate-500">
            Min. pesanan: {product.minOrder || "-"} {product.unit}
          </p>
        )}
        {product.description && (
          <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-slate-500">
            {product.description}
          </p>
        )}
      </div>
    </article>
  );
}
