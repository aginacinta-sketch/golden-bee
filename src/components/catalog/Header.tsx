"use client";

import { useEffect, useState } from "react";
import { Building2, ShieldCheck, Menu as MenuIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/lib/icons";
import { isPublicQrMode } from "@/lib/shareUrl";
import type { MenuItem, SettingsMap } from "@/lib/types";

interface Props {
  settings: SettingsMap;
  menus: MenuItem[];
  onContact: () => void;
  onNavigate: (target: string) => void;
}

export function Header({ settings, menus, onContact, onNavigate }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Mode publik (link hasil scan QR): tombol Admin disembunyikan (hydration-safe)
  const [publicQr, setPublicQr] = useState(false);

  useEffect(() => {
    setPublicQr(isPublicQrMode());
  }, []);

  const goAdmin = () => {
    // Minta aplikasi membuka halaman login admin (divalidasi ulang di
    // page.tsx — otomatis DITOLAK pada mode publik QR).
    window.dispatchEvent(new CustomEvent("buka-admin-login"));
  };

  return (
    <header className="sticky top-0 z-50 shadow-md" role="banner">
      {/* Baris utama */}
      <div className="bg-[var(--bp-header)] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-4">
            {/* Brand */}
            <button
              onClick={() => onNavigate("#beranda")}
              className="flex items-baseline gap-0.5 text-2xl font-bold tracking-tight select-none shrink-0"
              aria-label="Ke beranda"
            >
              <span className="text-white">{settings.brandPrimary}</span>
              <span style={{ color: "var(--bp-accent, #b1ab06)" }}>{settings.brandAccent}</span>
            </button>

            {/* Aksi */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                onClick={onContact}
                className="hidden xl:flex flex-col items-center gap-1 h-auto w-auto px-3 py-1.5 text-white hover:bg-white/10 hover:text-white text-xs font-medium"
              >
                <Building2 className="h-5 w-5" />
                Jadi Pemasok
              </Button>
              {!publicQr && (
                <Button
                  variant="ghost"
                  onClick={goAdmin}
                  aria-label="Masuk panel admin"
                  className="flex flex-col items-center gap-1 h-auto w-auto px-3 py-1.5 text-white hover:bg-white/10 hover:text-white text-xs font-medium"
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <button
                className="md:hidden ml-1 p-2 text-white"
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-label="Buka menu navigasi"
              >
                {mobileNavOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigasi menu */}
      <nav className="border-b bg-white" aria-label="Menu utama">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="hidden md:flex items-center gap-1 overflow-x-auto nice-scroll">
            {menus.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onNavigate(m.target)}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700 transition hover:text-[var(--bp-accent-dark)]"
                >
                  {m.icon && <DynamicIcon name={m.icon} className="h-4 w-4" />}
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
          {mobileNavOpen && (
            <ul className="md:hidden py-2">
              {menus.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      onNavigate(m.target);
                      setMobileNavOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-2 py-2.5 text-sm font-medium text-slate-700"
                  >
                    {m.icon && <DynamicIcon name={m.icon} className="h-4 w-4" />}
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}
