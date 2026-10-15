"use client";

import { useCallback, useEffect, useState } from "react";
import { useChatAdmin } from "@/store/chatAdmin";
import { apakahNadaAktif, bukaKunciAudio, setNadaAktif, ujiNadaAdmin } from "@/lib/sound";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Hook Audio Alert & Notifikasi Live Chat untuk Panel Admin.
 *
 * Mengaktifkan deteksi dan peringatan audio secara berkelanjutan di seluruh
 * halaman admin (Dashboard, Live Chat, Pesan, Produk, Menu, dsb.), sehingga
 * admin dapat segera merespons pesan baru pengunjung secara cepat dan tanggap.
 */
export function useNotifikasiChatAdmin(
  authed: boolean,
  onBukaTabLiveChat?: () => void
) {
  const { toast } = useToast();
  const totalBelum = useChatAdmin((s) => s.totalBelum);
  const [audioAktif, setAudioAktifState] = useState<boolean>(() =>
    apakahNadaAktif("admin")
  );

  // Mulai store chat admin saat admin terautentikasi
  useEffect(() => {
    if (!authed) {
      useChatAdmin.getState().berhenti();
      return;
    }

    useChatAdmin.getState().mulai();

    // Buka kunci AudioContext secara proaktif saat admin berinteraksi
    const bukaKunci = () => {
      void bukaKunciAudio();
    };
    window.addEventListener("pointerdown", bukaKunci, { passive: true });
    window.addEventListener("click", bukaKunci, { passive: true });
    window.addEventListener("keydown", bukaKunci, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", bukaKunci);
      window.removeEventListener("click", bukaKunci);
      window.removeEventListener("keydown", bukaKunci);
    };
  }, [authed]);

  // Dengarkan event pesan chat baru dari pengunjung
  useEffect(() => {
    if (!authed) return;

    const tanganiPesanBaru = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          conversationId: string;
          visitorName: string;
          text: string;
        }>
      ).detail;

      if (!detail) return;

      const nama = detail.visitorName || "Pengunjung Website";
      const cuplikan = detail.text
        ? detail.text.length > 55
          ? detail.text.slice(0, 52) + "…"
          : detail.text
        : "Mengirim pesan baru…";

      toast({
        title: `💬 Pesan Live Chat Baru: ${nama}`,
        description: `"${cuplikan}"`,
        duration: 9000,
        action: onBukaTabLiveChat ? (
          <ToastAction
            altText="Buka Chat"
            onClick={() => {
              onBukaTabLiveChat();
              useChatAdmin.getState().pilih(detail.conversationId);
            }}
          >
            Buka Chat
          </ToastAction>
        ) : undefined,
      });
    };

    window.addEventListener("b2b-admin-new-chat-message", tanganiPesanBaru);
    return () => {
      window.removeEventListener("b2b-admin-new-chat-message", tanganiPesanBaru);
    };
  }, [authed, onBukaTabLiveChat, toast]);

  // Sinkronkan state audio saat berubah di tab/komponen lain
  useEffect(() => {
    const tanganiPerubahanNada = (e: Event) => {
      const detail = (e as CustomEvent<{ sisi: string; aktif: boolean }>).detail;
      if (detail && detail.sisi === "admin") {
        setAudioAktifState(detail.aktif);
      }
    };
    window.addEventListener("b2b-nada-status-changed", tanganiPerubahanNada);
    return () => {
      window.removeEventListener("b2b-nada-status-changed", tanganiPerubahanNada);
    };
  }, []);

  const ubahAudioAktif = useCallback((aktif: boolean) => {
    setAudioAktifState(aktif);
    setNadaAktif("admin", aktif);
    if (aktif) {
      void ujiNadaAdmin();
    }
  }, []);

  const ujiAudio = useCallback(async () => {
    setNadaAktif("admin", true);
    setAudioAktifState(true);
    const ok = await ujiNadaAdmin();
    if (ok) {
      toast({
        title: "🔔 Audio Alert Aktif!",
        description: "Dentang notifikasi pesan live chat berfungsi dengan baik.",
        duration: 3500,
      });
    }
    return ok;
  }, [toast]);

  return {
    totalUnreadChat: totalBelum,
    audioAktif,
    setAudioAktif: ubahAudioAktif,
    ujiAudio,
  };
}
