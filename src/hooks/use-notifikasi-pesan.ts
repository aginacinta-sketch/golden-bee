"use client";

/**
 * Hook notifikasi pesan masuk (khusus admin yang memiliki sesi aktif).
 *
 * Memeriksa "denyut" jumlah pesan setiap 15 detik dan menampilkan toast + nada
 * dentang bila ada pesan baru. Hook ini dipasang sekali di root aplikasi
 * sehingga notifikasi tetap muncul baik saat admin berada di panel admin
 * maupun saat membuka situs publik miliknya.
 *
 * Keamanan & privasi: pemeriksaan hanya mengirim request bila token admin
 * tersedia di localStorage — pengunjung situs publik sama sekali tidak
 * melakukan polling. Pada mode publik link QR (?via=qr) pemeriksaan juga
 * dilewati agar tampilan tetap murni seperti pengunjung.
 */

import { useEffect, useRef } from "react";
import { clearToken, getToken } from "@/lib/client";
import { isPublicQrMode } from "@/lib/shareUrl";
import { mainkanNadaPesanMasuk } from "@/lib/sound";
import { useToast } from "@/hooks/use-toast";

const INTERVAL_POLLING_MS = 15000;

export function useNotifikasiPesanBaru(diPanelAdmin: boolean) {
  const { toast } = useToast();
  // Basis jumlah pesan — useRef agar tidak memicu render ulang.
  const baselinePesan = useRef<number | null>(null);
  // Penanda agar toast "sesi berakhir" hanya muncul sekali per kejadian sesi rusak.
  const sudahBeriTahuSesiBerakhir = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const cekPesanBaru = async () => {
      // Tanpa sesi admin / tab tidak terlihat / mode publik QR: lewati tanpa request.
      if (document.hidden || isPublicQrMode()) return;
      const token = getToken();
      if (!token) return;
      try {
        // Pakai fetch langsung (bukan adminFetch) agar polling yang gagal TIDAK
        // menghapus token di belakang layar — admin diberi tahu lewat toast.
        const res = await fetch("/api/admin/contacts/pulse", {
          headers: { "x-admin-token": token },
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          // Sesi tidak berlaku lagi (mis. diganti login di perangkat lain).
          // Beri tahu SEKALI agar admin paham notifikasi berhenti, lalu berhenti polling.
          if (!sudahBeriTahuSesiBerakhir.current) {
            sudahBeriTahuSesiBerakhir.current = true;
            clearToken();
            toast({
              title: "Sesi admin berakhir",
              description:
                "Masuk kembali (menu Admin) untuk mengaktifkan kembali notifikasi pesan.",
              duration: 8000,
            });
          }
          return;
        }
        if (!res.ok) return;
        // Sesi sehat lagi — izinkan pemberitahuan bila nanti rusak kembali.
        sudahBeriTahuSesiBerakhir.current = false;
        const data = (await res.json()) as {
          total: number;
          terbaru: { nama: string; produk: string } | null;
        };
        if (cancelled) return;
        const sebelumnya = baselinePesan.current;
        baselinePesan.current = data.total;
        // Pemeriksaan pertama hanya menetapkan basis (tanpa toast saat halaman dibuka).
        if (sebelumnya !== null && data.total > sebelumnya) {
          const jumlah = data.total - sebelumnya;
          const t = data.terbaru;
          mainkanNadaPesanMasuk("admin");
          const arahkan = diPanelAdmin ? "Buka menu Pesan" : "Buka Panel Admin";
          toast({
            title: jumlah > 1 ? `${jumlah} pesan baru masuk!` : "Pesan baru masuk!",
            description: t
              ? `Dari ${t.nama}${t.produk ? ` — minat: ${t.produk}` : ""}. ${arahkan} untuk melihatnya.`
              : `${arahkan} untuk melihatnya.`,
            duration: 8000,
          });
        }
      } catch {
        // abaikan (gangguan jaringan / sesi berakhir)
      }
    };

    cekPesanBaru();
    const timer = window.setInterval(cekPesanBaru, INTERVAL_POLLING_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [diPanelAdmin, toast]);
}
