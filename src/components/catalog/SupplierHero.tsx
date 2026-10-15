"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Mail,
  QrCode,
  Share2,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SocialLinks } from "./SocialLinks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/lib/icons";
import { parseTagsClient } from "@/lib/clientHelpers";
import { buildShareUrl, withQrMarkerIfSelf } from "@/lib/shareUrl";
import { useToast } from "@/hooks/use-toast";
import type { SettingsMap } from "@/lib/types";

interface Props {
  settings: SettingsMap;
  onContact: () => void;
}

const SHIP_PREFIX = "area pengiriman";

/** Ikon WhatsApp (glyph simple-icons) — lucide tidak menyediakan ikon WhatsApp. */
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export function SupplierHero({ settings, onContact }: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    setProfileUrl(buildShareUrl());
    const onHash = () => setProfileUrl(buildShareUrl());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const tags = parseTagsClient(settings.tags);
  const desc = settings.supplierDesc || "";

  // Pisahkan tag biasa (pil abu-abu) dan tag area pengiriman (pil aksen)
  const { normalTags, shipTag } = useMemo(() => {
    const normal: { icon: string; label: string }[] = [];
    let ship: { icon: string; label: string } | null = null;
    for (const t of tags) {
      if (t.label.toLowerCase().startsWith(SHIP_PREFIX)) ship = t;
      else normal.push(t);
    }
    return { normalTags: normal, shipTag: ship };
  }, [tags]);

  const showVerified = settings.verified === "1";
  const showQr = settings.showQr === "1";
  // Isi QR code: link kustom dari admin bila diatur, selain itu tautan profil otomatis.
  const rawCustomQr = (settings.qrCustomUrl || "").trim();
  const qrValue = mounted ? (rawCustomQr ? withQrMarkerIfSelf(rawCustomQr) : profileUrl) : "";
  const isCustomQr = rawCustomQr.length > 0;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    settings.supplierAddress || ""
  )}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: "Tautan disalin!", description: "Bagikan QR / tautan pemasok ini." });
    } catch {
      toast({ title: "Gagal menyalin tautan", variant: "destructive" });
    }
  };

  // Bagikan tautan profil / kustom via WhatsApp (pilih kontak di aplikasi WA)
  const shareWhatsApp = () => {
    const text = `Lihat katalog ${settings.supplierName} di sini: ${qrValue}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section id="beranda" className="scroll-mt-36" aria-label="Profil pemasok">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-5">
        <div className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
            {/* Logo dalam kartu */}
            <div className="shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-xl border bg-white p-1.5 shadow-sm sm:h-32 sm:w-32 lg:h-40 lg:w-40">
                {settings.supplierLogo ? (
                  <img
                    src={settings.supplierLogo}
                    alt={`Logo ${settings.supplierName}`}
                    className="h-full w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-3xl font-bold text-[var(--bp-accent-dark)]">
                    {(settings.supplierName || "S").charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Info utama */}
            <div className="min-w-0 flex-1">
              {/* Nama + badge verifikasi */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  {settings.supplierName}
                </h1>
                {showVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--bp-accent)_35%,transparent)] bg-[var(--bp-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--bp-accent-dark)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Terverifikasi
                  </span>
                )}
              </div>

              {/* Negara • Lokasi • Peta */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>{settings.supplierFlag}</span>
                  {settings.supplierCountryCode && (
                    <span className="font-bold text-slate-900">{settings.supplierCountryCode}</span>
                  )}
                  {settings.supplierCountry && <span>/ {settings.supplierCountry}</span>}
                </span>
                {settings.supplierAddress && (
                  <>
                    <span aria-hidden className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="underline decoration-slate-300 underline-offset-2">
                        {settings.supplierAddress}
                      </span>
                    </span>
                  </>
                )}
                {settings.supplierAddress && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-[var(--bp-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--bp-accent-dark)] transition hover:brightness-95"
                    aria-label={`Lihat peta lokasi ${settings.supplierName}`}
                  >
                    Peta
                  </a>
                )}
              </div>

              {/* Tag pemasok (pil abu-abu) */}
              {normalTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalTags.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                    >
                      <DynamicIcon name={t.icon} className="h-4 w-4 text-slate-500" />
                      {t.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Area pengiriman + QR profil (pil aksen) */}
              {(shipTag || showQr) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {shipTag && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bp-accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--bp-accent-dark)]">
                      <DynamicIcon name={shipTag.icon} className="h-4 w-4" />
                      {shipTag.label}
                    </span>
                  )}
                  {showQr && (
                    <button
                      type="button"
                      onClick={() => setQrOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bp-accent-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--bp-accent-dark)] transition hover:brightness-95"
                      aria-label="Buka QR Code profil"
                    >
                      <QrCode className="h-4 w-4" />
                      QR Code Profil
                    </button>
                  )}
                </div>
              )}

              {/* Deskripsi */}
              {desc && (
                <div className="mt-3 max-w-2xl">
                  <p className={`text-sm leading-relaxed text-slate-600 ${expanded ? "" : "line-clamp-3"}`}>
                    {desc}
                  </p>
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--bp-accent-dark)] underline underline-offset-2 hover:opacity-80"
                  >
                    {expanded ? (
                      <>
                        Sembunyikan <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Baca selengkapnya <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Kolom kanan: aksi, QR, statistik */}
            <div className="flex shrink-0 flex-col gap-3 md:w-72 lg:w-72">
              <button
                onClick={onContact}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bp-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--bp-accent-dark)] active:scale-[0.98]"
              >
                <Mail className="h-4 w-4" />
                Hubungi Pemasok
              </button>

              {showQr && (
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  data-share-url={qrValue || undefined}
                  className="group flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition hover:shadow-md"
                  aria-label="Buka QR Code ponsel profil pemasok"
                >
                  <span className="shrink-0 bg-white">
                    {qrValue ? (
                      <QRCodeSVG value={qrValue} size={52} />
                    ) : (
                      <QrCode className="h-[52px] w-[52px] text-slate-300" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">QR Code Ponsel</span>
                    <span className="block text-xs text-slate-500">Klik untuk pindai &amp; bagikan</span>
                  </span>
                  <Share2 className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[var(--bp-accent-dark)]" />
                </button>
              )}

              <div className="flex items-center pt-1" role="list" aria-label="Statistik respons pemasok">
                <div className="flex-1 text-center" role="listitem">
                  <p className="text-base font-bold text-slate-900">{settings.responseRate || "98%"}</p>
                  <p className="text-xs text-slate-500">Tingkat Respons</p>
                </div>
                <div className="h-8 w-px bg-slate-200" aria-hidden />
                <div className="flex-1 text-center" role="listitem">
                  <p className="text-base font-bold text-slate-900">{settings.responseTime || "< 2 Jam"}</p>
                  <p className="text-xs text-slate-500">Kecepatan Balas</p>
                </div>
              </div>

              {/* Media sosial pemasok (ikon berwarna brand) */}
              {(settings.socialFacebook || settings.socialInstagram || settings.socialTiktok || settings.socialYoutube) && (
                <div className="border-t border-slate-100 pt-3">
                  <SocialLinks
                    facebook={settings.socialFacebook}
                    instagram={settings.socialInstagram}
                    tiktok={settings.socialTiktok}
                    youtube={settings.socialYoutube}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Dialog QR Code Profil — tampilan rapi, bersih & elegan */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[350px]">
          <DialogHeader className="items-center text-center sm:items-center sm:text-center">
            <DialogTitle className="text-lg font-bold">QR Code Profil</DialogTitle>
            <DialogDescription className="max-w-[280px] text-balance">
              {isCustomQr
                ? "Pindai kode QR untuk membuka tautan kustom di perangkat lain."
                : `Pindai kode QR untuk membuka profil ${settings.supplierName} di perangkat lain.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 pb-1">
            {/* Bingkai QR elegan — gradasi lembut warna aksen + kartu putih di dalam */}
            <div className="rounded-[26px] bg-gradient-to-br from-[var(--bp-accent-soft)] via-white to-[var(--bp-accent-soft)] p-3 shadow-sm ring-1 ring-slate-200/70">
              <div className="rounded-[18px] bg-white p-3.5 ring-1 ring-slate-100">
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={164} />
                ) : (
                  <QrCode className="h-[164px] w-[164px] text-slate-300" />
                )}
              </div>
            </div>

            {/* Identitas pemasok */}
            <div className="-mt-1 text-center">
              <p className="text-sm font-bold text-slate-900">{settings.supplierName}</p>
              <p className="text-xs text-slate-500">
                {isCustomQr ? "Tautan kustom dari admin" : "Katalog B2B resmi"}
              </p>
            </div>

            {/* Kartu tautan target — teks wrap rapi (tidak terpotong kaku), klik untuk membuka */}
            {qrValue && (
              <a
                href={qrValue}
                target="_blank"
                rel="noopener noreferrer"
                title={qrValue}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition hover:border-[var(--bp-accent)] hover:bg-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bp-accent-soft)]">
                  <Link2 className="h-3.5 w-3.5 text-[var(--bp-accent-dark)]" />
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 break-all text-left text-[11px] leading-snug text-slate-500 group-hover:text-slate-700">
                  {qrValue.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              </a>
            )}

            {/* Aksi: salin tautan & bagikan via WhatsApp */}
            <div className="grid w-full grid-cols-2 gap-2.5">
              <Button
                onClick={copyLink}
                disabled={!qrValue}
                className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Tersalin" : "Salin Tautan"}
              </Button>
              <Button
                onClick={shareWhatsApp}
                disabled={!qrValue}
                className="bg-[#25D366] text-white hover:bg-[#1FB855]"
              >
                <WaIcon className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
