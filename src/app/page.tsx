"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogSite } from "@/components/catalog/CatalogSite";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { isPublicQrMode, ambilKunciAkses } from "@/lib/shareUrl";
import { getToken } from "@/lib/client";
import { useNotifikasiPesanBaru } from "@/hooks/use-notifikasi-pesan";

/**
 * Keputusan tampilan (katalog vs admin) — ANTISIPASI AKSES:
 *  1) Mode publik QR (?via=qr, termasuk varian "?via=qr/"): panel admin
 *     TIDAK PERNAH tampil — bahkan bagi admin ber-sesi. Pengunjung dari
 *     link QR hanya melihat website.
 *  2) Tanpa hash #admin → website katalog biasa.
 *  3) Hash #admin + token sesi valid → panel admin langsung.
 *  4) Hash #admin + izin KLIK tombol Admin di header (izinAdminRef — flag
 *     in-memory, tidak persist) → halaman login.
 *  5) Hash #admin + kunci rahasia valid (/?k=KUNCI#admin) → halaman login.
 *  6) Selain itu (mis. mengetik /#admin atau ?k=salah#admin) → katalog
 *     murni TANPA jejak login apa pun.
 */
export default function Home() {
  const [view, setView] = useState<"catalog" | "admin">("catalog");
  // Notifikasi pesan kontak masuk (toast + dentang) untuk admin ber-sesi —
  // dipasang sekali di root agar hidup di katalog maupun panel admin.
  useNotifikasiPesanBaru(view === "admin");
  // Izin membuka halaman login yang HANYA diberikan lewat klik tombol Admin
  // di header (custom event) — flag in-memory, hilang saat halaman dimuat ulang.
  const izinAdminRef = useRef(false);

  useEffect(() => {
    const putuskanView = async (): Promise<"catalog" | "admin" | null> => {
      // 1) Mode publik QR: blokir total, apa pun kondisi sesi/hash/kunci.
      if (isPublicQrMode()) return "catalog";
      // 2) Tanpa hash #admin → website biasa.
      if (!window.location.hash.startsWith("#admin")) return "catalog";
      // 3) Admin ber-sesi (token valid) → panel langsung.
      const token = getToken();
      if (token) {
        try {
          const res = await fetch("/api/admin/session", {
            headers: { "x-admin-token": token },
            cache: "no-store",
          });
          if (res.ok) return "admin";
        } catch {
          // jaringan gagal → lanjut pemeriksaan berikutnya
        }
      }
      // 4) Izin dari klik tombol Admin pada sesi halaman ini.
      if (izinAdminRef.current) return "admin";
      // 5) Kunci rahasia pada URL (tautan berkunci).
      const kunci = ambilKunciAkses();
      if (kunci) {
        try {
          const res = await fetch(`/api/admin/gate?key=${encodeURIComponent(kunci)}`, {
            cache: "no-store",
          });
          if (res.ok) return "admin";
        } catch {
          // abaikan — kunci tidak bisa diverifikasi
        }
      }
      // 6) Selain itu: katalog murni — TANPA form login apa pun.
      return "catalog";
    };

    const terapkan = () => {
      void putuskanView().then((hasil) => {
        // Keputusan selesai — lepas penahan boot admin (kelas boot-admin
        // menyembunyikan katalog + menampilkan layar netral saat boot
        // dengan hash #admin; lihat layout.tsx & globals.css).
        document.documentElement.classList.remove("boot-admin");
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

  return view === "admin" ? <AdminPanel /> : <CatalogSite />;
}
