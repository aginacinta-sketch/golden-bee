"use client";

import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Youtube } from "lucide-react";
import { TiktokMonoIcon } from "./SocialLinks";
import { DynamicIcon } from "@/lib/icons";
import type { MenuItem, SettingsMap } from "@/lib/types";

interface Props {
  settings: SettingsMap;
  menus: MenuItem[];
  onNavigate: (target: string) => void;
}

export function SiteFooter({ settings, menus, onNavigate }: Props) {
  return (
    <footer id="kontak" className="mt-auto scroll-mt-36 bg-[var(--bp-header)] text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="text-2xl font-bold tracking-tight">
              <span>{settings.brandPrimary}</span>
              <span style={{ color: "var(--bp-accent, #84BD00)" }}>{settings.brandAccent}</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{settings.footerText}</p>
            <div className="mt-4 flex gap-2">
              {[Facebook, Instagram, TiktokMonoIcon, Youtube].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 transition hover:bg-[var(--bp-accent)]"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          {/* Menu */}
          <nav aria-label="Menu footer">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Menu</h3>
            <ul className="mt-4 space-y-2.5">
              {menus.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => onNavigate(m.target)}
                    className="flex items-center gap-2 text-sm text-white/70 transition hover:text-[var(--bp-accent)]"
                  >
                    {m.icon && <DynamicIcon name={m.icon} className="h-3.5 w-3.5" />}
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kontak */}
          <div id="footer-kontak">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Kontak Kami</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                <span>{settings.supplierAddress}</span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                <span>{settings.contactPhone}</span>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                <span className="break-all">{settings.contactEmail}</span>
              </li>
              <li className="flex gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                <span>
                  Senin – Jumat: 08.00 – 17.00 WIB
                  <br />
                  Sabtu: 08.00 – 14.00 WIB
                </span>
              </li>
            </ul>
          </div>

          {/* Layanan */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Layanan</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li>Distribusi &amp; Grosir</li>
              <li>Ekspor Seluruh Dunia</li>
              <li>Pesanan Kustom (OEM)</li>
              <li>Dokumen &amp; Sertifikasi Ekspor</li>
              <li>Konsultasi Produk</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/50 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.supplierName}. Seluruh hak cipta dilindungi.
          </p>
          <p>Website ini Dirancang dan Dibangun Oleh Yuli Afriani</p>
        </div>
      </div>
    </footer>
  );
}
