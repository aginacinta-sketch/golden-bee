"use client";

import { useEffect, useState } from "react";
import { Star, Quote, UserRound, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;
  return (
    <section id="testimoni" className="scroll-mt-36 bg-slate-50 py-12" aria-label="Testimoni pelanggan">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Apa Kata Pelanggan Kami</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Kepercayaan pembeli di berbagai negara adalah prioritas utama kami
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="relative flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
              <Quote className="absolute right-4 top-4 h-6 w-6 text-[var(--bp-accent)] opacity-40" />
              <div className="flex gap-0.5" aria-label={`Penilaian ${t.rating} dari 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < t.rating ? "fill-[var(--bp-accent)] text-[var(--bp-accent)]" : "fill-slate-200 text-slate-200"
                    )}
                  />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-slate-600">“{t.content}”</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-2">
                {t.photo ? (
                   
                  <img src={t.photo} alt={`Foto ${t.name}`} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bp-accent-soft)] text-[var(--bp-accent-dark)]">
                    <UserRound className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">
                    {[t.role, t.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ settings }: { settings: Record<string, string> }) {
  // Statistik bagian Tentang (dikelola lewat admin panel; kosong = disembunyikan)
  const stats = [
    { value: settings.expYears, label: "Tahun Pengalaman" },
    { value: settings.destCountries, label: "Negara Tujuan" },
    { value: settings.b2bCustomers, label: "Pelanggan B2B" },
  ].filter((s) => !!s.value);

  // Peta lokasi (link share/embed diatur dari admin panel; hanya https, kosong = disembunyikan)
  const mapUrl = (settings.mapEmbedUrl || "").trim();
  const showMap = /^https:\/\//i.test(mapUrl);
  const isDirectEmbed = /output=embed|\/maps\/embed/i.test(mapUrl);

  // Link share Google Maps dikonversi otomatis menjadi link embed via /api/map-embed.
  // Satu state untuk hasil resolusi; gagal ditandai failed=true (url dipakai sebagai
  // penjaga kebaruan sehingga tidak perlu reset state sinkron di dalam effect).
  const [resolusi, setResolusi] = useState<{ url: string; embed?: string; failed?: boolean } | null>(null);
  useEffect(() => {
    if (!showMap || isDirectEmbed) return;
    let alive = true;
    fetch(`/api/map-embed?url=${encodeURIComponent(mapUrl)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("gagal konversi"))))
      .then((d: { embedUrl?: string }) => {
        if (alive) setResolusi({ url: mapUrl, embed: d.embedUrl, failed: !d.embedUrl });
      })
      .catch(() => {
        if (alive) setResolusi({ url: mapUrl, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [mapUrl, showMap, isDirectEmbed]);

  // Guard hasil usang: hanya pakai resolusi yang cocok dengan URL saat ini
  const mapSrc = isDirectEmbed
    ? mapUrl
    : resolusi && resolusi.url === mapUrl && resolusi.embed
      ? resolusi.embed
      : null;
  const gagalPeta = !isDirectEmbed && !!resolusi && resolusi.url === mapUrl && !!resolusi.failed;

  return (
    <section id="tentang" className="scroll-mt-36 py-12" aria-label="Tentang kami">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900">{settings.aboutTitle || "Tentang Kami"}</h2>
            <div className="mt-3 h-1 w-16 rounded-full bg-[var(--bp-accent)]" />
            {stats.length > 0 && (
              <dl
                className={`mt-6 grid gap-3 ${
                  stats.length === 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3"
                }`}
              >
                {stats.map((s) => (
                  <div key={s.label} className="rounded-lg border bg-white p-3 text-center">
                    <dt className="text-xl font-bold text-[var(--bp-accent-dark)]">{s.value}</dt>
                    <dd className="text-xs text-slate-500">{s.label}</dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Peta lokasi kecil — sejajar dengan baris statistik, diberi jarak agar tidak terlalu dekat */}
            {showMap && mapSrc && (
              <div className="mt-6 overflow-hidden rounded-lg border bg-white shadow-sm">
                <iframe
                  src={mapSrc}
                  title="Peta lokasi pemasok"
                  className="block h-40 w-full sm:h-44"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            )}
            {/* Cadangan: bila link peta gagal dikonversi, tetap tampilkan kartu tautan lokasi */}
            {showMap && !mapSrc && gagalPeta && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition hover:border-[var(--bp-accent)] hover:shadow"
                aria-label="Buka lokasi di Google Maps"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent-soft)] text-[var(--bp-accent-dark)]">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">Lihat Lokasi Kami</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    Buka di Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </span>
              </a>
            )}
          </div>
          <div className="lg:col-span-3">
            <p className="text-sm leading-7 text-slate-600 whitespace-pre-line">{settings.aboutText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaStrip({ onContact }: { onContact: () => void }) {
  return (
    <section className="bg-[var(--bp-accent)]" aria-label="Ajakan menghubungi pemasok">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-bold text-white sm:text-2xl">Tertarik dengan produk kami?</h2>
          <p className="mt-1 text-sm text-white/85">
            Kirim permintaan kontak sekarang dan dapatkan penawaran harga terbaik untuk kebutuhan bisnis Anda.
          </p>
        </div>
        <button
          onClick={onContact}
          className="shrink-0 rounded-md bg-white px-8 py-3 text-sm font-bold text-[var(--bp-accent-dark)] shadow transition hover:bg-slate-100 active:scale-[0.98]"
        >
          Kirim Permintaan Kontak
        </button>
      </div>
    </section>
  );
}
