"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogSite } from "@/components/catalog/CatalogSite";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { isPublicQrMode } from "@/lib/shareUrl";
import { useNotifikasiPesanBaru } from "@/hooks/use-notifikasi-pesan";
import type { SettingsMap } from "@/lib/types";

export default function Home() {
  const [view, setView] = useState<"catalog" | "admin">("catalog");
  const [sharedSettings, setSharedSettings] = useState<SettingsMap | null>(null);
  useNotifikasiPesanBaru(view === "admin");
  // Izin membuka halaman login yang HANYA diberikan lewat klik tombol Admin
  // di header (custom event) — flag in-memory, hilang saat halaman dimuat ulang.
  const izinAdminRef = useRef(false);

  useEffect(() => {
    const putuskanView = async (): Promise<"catalog" | "admin" | null> => {
      // 1) Mode publik QR (?via=qr): blokir total akses admin untuk pengunjung QR.
      if (isPublicQrMode()) return "catalog";
      // 2) Bila hash diawali #admin → tampilkan panel admin (menampilkan login bila belum terotentikasi).
      if (window.location.hash.startsWith("#admin")) return "admin";
      // 3) Selain itu: katalog publik.
      return "catalog";
    };

    const terapkan = () => {
      void putuskanView().then((hasil) => {
        if (hasil) setView(hasil);
      });
    };

    terapkan();
    // Mode publik (link QR): tandai <html> agar CSS menyembunyikan
    // indikator dev tools Next.js (badge "N" di pojok kiri bawah)
    if (isPublicQrMode()) {
      document.documentElement.classList.add("qr-public");
    }

    // Klik tombol Admin di header → minta halaman login (ditolak di mode QR).
    const bukaDariTombol = () => {
      if (isPublicQrMode()) return;
      izinAdminRef.current = true;
      if (window.location.hash.startsWith("#admin")) {
        void putuskanView().then((hasil) => {
          if (hasil) setView(hasil);
        });
      } else {
        window.location.hash = "#admin";
      }
    };

    window.addEventListener("hashchange", terapkan);
    window.addEventListener("buka-admin-login", bukaDariTombol);
    return () => {
      window.removeEventListener("hashchange", terapkan);
      window.removeEventListener("buka-admin-login", bukaDariTombol);
    };
  }, []);

  return view === "admin" ? (
    <AdminPanel onSettingsChange={setSharedSettings} />
  ) : (
    <CatalogSite initialSettings={sharedSettings || undefined} onSettingsLoaded={setSharedSettings} />
  );
}
