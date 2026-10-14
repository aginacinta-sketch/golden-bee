"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Play, PackageX, ImageIcon, Loader2, ZoomIn, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatHarga } from "@/lib/format";
import type { Product } from "@/lib/types";

interface GridProps {
  products: Product[];
  search: string;
  onSearchChange: (v: string) => void;
  onContact: (p: Product) => void;
  onPlayVideo: (p: Product) => void;
  onOpenDetail: (p: Product) => void;
  onPrintCatalog: () => void;
  loading: boolean;
}

export function ProductGrid({ products, search, onSearchChange, onContact, onPlayVideo, onOpenDetail, onPrintCatalog, loading }: GridProps) {
  const [category, setCategory] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = !category || p.category === category;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.features.some((f) => f.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [products, search, category]);

  return (
    <section id="produk" className="scroll-mt-36" aria-label="Katalog produk">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Judul + pencarian produk */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            Semua Produk &amp; Layanan{" "}
            <span className="text-slate-400">({loading ? "…" : filtered.length})</span>
          </h2>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative w-full sm:w-80"
            role="search"
            aria-label="Cari produk dalam katalog"
          >
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari produk…"
              className="h-11 w-full rounded-full border border-slate-300 bg-white pl-4 pr-14 text-sm outline-none ring-[var(--bp-accent)] focus:ring-2"
              aria-label="Cari produk"
            />
            <span className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bp-accent)] text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </span>
          </form>
        </div>

        {/* Filter kategori + tombol unduh katalog (sejajar di desktop, bertumpuk di mobile) */}
        <div className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {categories.length > 0 ? (
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto nice-scroll pb-1">
              <CategoryChip active={!category} onClick={() => setCategory("")} label="Semua" />
              {categories.map((c) => (
                <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)} label={c} />
              ))}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <button
            type="button"
            onClick={onPrintCatalog}
            disabled={products.length === 0}
            title="Cetak / simpan katalog lengkap sebagai PDF"
            aria-label="Unduh katalog produk lengkap (cetak atau simpan sebagai PDF)"
            className="flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--bp-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--bp-accent-dark)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
          >
            <Download className="h-4 w-4" aria-hidden />
            Unduh Katalog
          </button>
        </div>

        {/* Grid produk */}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-white">
                <div className="aspect-square rounded-t-xl bg-slate-200" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                  <div className="h-8 w-full rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <PackageX className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600">Tidak ada produk yang cocok dengan pencarian Anda.</p>
            <p className="text-sm text-slate-400">Coba kata kunci lain atau pilih kategori berbeda.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((p, i) => (
                <ProductCard
                  key={p.id}
                  index={i}
                  product={p}
                  onContact={() => onContact(p)}
                  onPlayVideo={() => onPlayVideo(p)}
                  onOpenDetail={() => onOpenDetail(p)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

function CategoryChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition",
        active
          ? "border-[var(--bp-accent)] bg-[var(--bp-accent)] text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-[var(--bp-accent)] hover:text-[var(--bp-accent-dark)]"
      )}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  index,
  onContact,
  onPlayVideo,
  onOpenDetail,
}: {
  product: Product;
  index: number;
  onContact: () => void;
  onPlayVideo: () => void;
  onOpenDetail: () => void;
}) {
  const images = product.images && product.images.length > 0 ? product.images : [];
  return (
    <motion.article
      layout="position"
      initial="hidden"
      whileInView="show"
      exit="out"
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, delay: (index % 8) * 0.07, ease: "easeOut" },
        },
        out: { opacity: 0, scale: 0.94, transition: { duration: 0.18 } },
      }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <ImageCarousel images={images} name={product.name} video={product.video} onPlayVideo={onPlayVideo} onOpenDetail={onOpenDetail} featured={product.featured} />

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="font-semibold leading-snug text-slate-900 line-clamp-2">
          {product.name}
          {product.category && <span className="font-normal text-slate-500"> - {product.category}</span>}
        </h3>

        {/* Harga estimasi */}
        {product.priceMin != null || product.priceMax != null ? (
          <p className="text-base font-bold leading-tight text-[var(--bp-accent-dark)]">
            {formatHarga(product.priceMin, product.priceMax, product.unit)}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Harga: hubungi kami</p>
        )}

        {product.features.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
            {product.features.slice(0, 4).map((f, i) => (
              <li key={i} className="line-clamp-2">
                {f}
              </li>
            ))}
          </ul>
        )}

        {(product.minOrder || product.unit) && (
          <p className="text-xs text-slate-400">
            Min. pesanan: <span className="font-medium text-slate-500">{product.minOrder || "-"} {product.unit}</span>
          </p>
        )}

        <div className="mt-auto pt-1.5">
          <button
            onClick={onContact}
            className="w-full rounded-md border-2 border-[var(--bp-accent)] bg-white py-2 text-sm font-bold text-slate-800 transition hover:bg-[var(--bp-accent-soft)] active:scale-[0.98]"
          >
            Hubungi Pemasok
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function ImageCarousel({
  images,
  name,
  video,
  onPlayVideo,
  onOpenDetail,
  featured,
}: {
  images: string[];
  name: string;
  video: string;
  onPlayVideo: () => void;
  onOpenDetail: () => void;
  featured: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [rasio, setRasio] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const n = images.length;

  // Thumbnail responsif: rasio kotak gambar mengikuti rasio asli gambar pertama
  // yang diunggah (dibatasi 0.55–1.9 agar kartu tidak terlalu memjang/pipih).
  // Semua gambar tampil UTUH (object-contain) — tidak ada lagi bagian terpotong.
  const rasioTampil = rasio ? Math.min(1.9, Math.max(0.55, rasio)) : 1;

  const go = (dir: number) => {
    if (n === 0) return;
    setIdx((v) => (v + dir + n) % n);
  };

  return (
    <div
      className="group relative overflow-hidden bg-slate-100"
      style={{ aspectRatio: `${rasioTampil}` }}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {n > 0 ? (
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={onOpenDetail}
              aria-label={`Lihat detail ${name}`}
              className="block h-full w-full shrink-0 cursor-zoom-in"
            >
              <img
                src={src}
                alt={`${name} — gambar ${i + 1}`}
                onLoad={
                  i === 0
                    ? (e) => {
                        const el = e.currentTarget;
                        if (el.naturalWidth > 0 && el.naturalHeight > 0) {
                          setRasio(el.naturalWidth / el.naturalHeight);
                        }
                      }
                    : undefined
                }
                className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-10 w-10 text-slate-300" />
        </div>
      )}

      {/* Petunjuk klik: lihat detail produk */}
      {n > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-slate-900/0 opacity-0 transition duration-200 group-hover:bg-slate-900/30 group-hover:opacity-100 group-focus-within:bg-slate-900/30 group-focus-within:opacity-100 md:flex"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-md">
            <ZoomIn className="h-3.5 w-3.5" />
            Lihat Detail
          </span>
        </span>
      )}

      {featured && (
        <Badge className="absolute left-2.5 top-2.5 bg-[var(--bp-accent)] font-semibold text-white hover:bg-[var(--bp-accent)]">
          Unggulan
        </Badge>
      )}

      {video && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayVideo();
          }}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
          aria-label="Putar video produk"
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
      )}

      {n > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Gambar sebelumnya"
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Gambar berikutnya"
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === idx ? "w-4 bg-[var(--bp-accent)]" : "w-1.5 bg-white shadow-sm"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
