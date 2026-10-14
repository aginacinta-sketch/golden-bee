"use client";

import { Check, Printer, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatHarga, kapital } from "@/lib/format";
import type { Product, SettingsMap } from "@/lib/types";

/**
 * Dialog detail produk (tampil saat gambar produk diklik) + lembar cetak.
 * - Dialog: susunan padat & elegan — gambar full-bleed di kiri, info di kanan
 *   (desktop), bertumpuk di mobile — dengan tombol "Cetak / Simpan PDF".
 * - Lembar cetak: dirender terpisah di luar wrapper aplikasi, hanya muncul
 *   pada media print (window.print() -> pilih "Simpan sebagai PDF").
 */

interface DetailProps {
  product: Product | null;
  settings: SettingsMap;
  onClose: () => void;
}

export function ProductDetailDialog({ product, settings, onClose }: DetailProps) {
  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-xl p-0 print:hidden sm:max-w-2xl"
      >
        {product && (
          <div className="relative max-h-[85vh] overflow-y-auto text-left">
            {/* Tombol tutup kustom */}
            <DialogClose
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white active:scale-95"
              aria-label="Tutup detail produk"
            >
              <X className="h-4 w-4" />
            </DialogClose>

            <div className="flex flex-col sm:flex-row">
              {/* Gambar produk (full-bleed) */}
              <div className="h-48 shrink-0 overflow-hidden bg-slate-100 sm:h-auto sm:min-h-[280px] sm:w-52 lg:w-60">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={`Gambar produk ${product.name}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    Tanpa gambar
                  </div>
                )}
              </div>

              {/* Informasi produk */}
              <div className="min-w-0 flex-1 p-5">
                {product.category && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--bp-accent-dark)]">
                    {product.category}
                  </p>
                )}
                <DialogTitle className="mt-0.5 pr-8 text-lg font-extrabold leading-snug text-slate-900">
                  {product.name}
                </DialogTitle>
                <p className="mt-1 text-base font-bold text-[var(--bp-accent-dark)]">
                  {product.priceMin != null || product.priceMax != null
                    ? formatHarga(product.priceMin, product.priceMax, product.unit)
                    : "Harga: hubungi kami"}
                </p>

                {/* Spesifikasi ringkas */}
                {(product.minOrder || product.unit) && (
                  <div className="mt-3 flex gap-2 text-xs">
                    {product.minOrder && (
                      <div className="flex-1 rounded-md border bg-slate-50/80 px-3 py-1.5">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Min. Pesanan
                        </span>
                        <span className="font-bold text-slate-900">
                          {product.minOrder} {product.unit}
                        </span>
                      </div>
                    )}
                    {product.unit && (
                      <div className="flex-1 rounded-md border bg-slate-50/80 px-3 py-1.5">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Satuan
                        </span>
                        <span className="font-bold text-slate-900">{kapital(product.unit)}</span>
                      </div>
                    )}
                  </div>
                )}

                {product.description && (
                  <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-slate-600">
                    {product.description}
                  </p>
                )}

                {product.features.length > 0 && (
                  <ul className="mt-2.5 space-y-1">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[13px] leading-snug text-slate-600">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--bp-accent)]" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Aksi cetak */}
            <div className="flex items-center justify-between gap-3 border-t bg-slate-50/70 px-5 py-3">
              <p className="hidden text-xs text-slate-400 sm:block">
                Detail produk • {settings.supplierName}
              </p>
              <Button
                onClick={() => window.print()}
                size="sm"
                className="ml-auto h-9 gap-1.5 bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Cetak / Simpan PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Lembar siap cetak (A4) — hanya tampil pada media print. */
export function ProductPrintSheet({ product, settings }: { product: Product; settings: SettingsMap }) {
  const tanggal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const img = product.images?.[0] || "";
  const harga =
    product.priceMin != null || product.priceMax != null
      ? formatHarga(product.priceMin, product.priceMax, product.unit)
      : "Hubungi kami";

  return (
    <div
      data-product-print-sheet
      className="hidden print:block bg-white p-2 text-slate-900"
    >
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

      {/* Judul produk */}
      <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--bp-accent-dark)]">
        Detail Produk
      </p>
      <h1 className="mt-1 text-2xl font-extrabold leading-snug">{product.name}</h1>
      {product.category && <p className="mt-0.5 text-sm text-slate-500">{product.category}</p>}

      {/* Gambar + spesifikasi */}
      <div className="mt-5 flex items-start gap-6">
        {img && (
          <img
            src={img}
            alt={product.name}
            className="h-40 w-40 shrink-0 rounded-lg border border-slate-200 object-contain p-1"
          />
        )}
        <dl className="min-w-0 flex-1 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Harga</dt>
            <dd className="text-right font-bold">{harga}</dd>
          </div>
          {(product.minOrder || product.unit) && (
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Min. Pesanan</dt>
              <dd className="text-right font-semibold">
                {product.minOrder || "-"} {product.unit}
              </dd>
            </div>
          )}
          {product.unit && (
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Satuan</dt>
              <dd className="text-right font-semibold">{kapital(product.unit)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Kategori</dt>
            <dd className="text-right font-semibold">{product.category || "-"}</dd>
          </div>
        </dl>
      </div>

      {/* Deskripsi */}
      {product.description && (
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Deskripsi
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
        </section>
      )}

      {/* Keunggulan */}
      {product.features.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Keunggulan Produk
          </h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
            {product.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer lembar cetak */}
      <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400">
        <span>Dicetak dari katalog {settings.supplierName}</span>
        <span>{tanggal}</span>
      </footer>
    </div>
  );
}
