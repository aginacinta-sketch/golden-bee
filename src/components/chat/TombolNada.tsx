"use client";

/**
 * TombolNada — tombol pengeras suara untuk mengaktifkan/mematikan nada
 * notifikasi live chat per sisi (admin / pengunjung). Preferensi tersimpan
 * di localStorage per perangkat/browser. Saat diaktifkan kembali, nada contoh
 * diputar seketika agar pengguna langsung mendengar notifikasinya (sekaligus
 * membuka izin audio browser lewat interaksi klik).
 */

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { apakahNadaAktif, mainkanNadaPesanMasuk, setNadaAktif, type SisiNada } from "@/lib/sound";

interface Props {
  sisi: SisiNada;
  /** true → gaya terang untuk kepala panel berlatar aksen (ikon putih). */
  terang?: boolean;
}

export function TombolNada({ sisi, terang }: Props) {
  const [aktif, setAktif] = useState(() => apakahNadaAktif(sisi));

  const ubah = () => {
    const berikut = !aktif;
    setAktif(berikut);
    setNadaAktif(sisi, berikut);
    if (berikut) mainkanNadaPesanMasuk(sisi); // nada contoh + buka izin audio
  };

  const label = aktif ? "Matikan nada notifikasi" : "Aktifkan nada notifikasi";

  return (
    <button
      type="button"
      onClick={ubah}
      aria-label={label}
      aria-pressed={aktif}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
        terang
          ? "text-white/90 hover:bg-white/15 hover:text-white"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      }`}
    >
      {aktif ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
