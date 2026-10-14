"use client";

// Widget Live Chat untuk pengunjung website (Task 52 — dibuat ulang).
//
// ARSITEKTUR: tanpa socket.io, tanpa mini-service terpisah. Semua data lewat
// API route Next.js yang sama origin (`/api/chat/*`) + polling adaptif:
// - Panel terbuka  : tarik pesan baru tiap 2 dtk (inkremental via `since`).
// - Panel tertutup : badge notifikasi tiap 6 dtk (endpoint `unread` murah).
// - Tab disembunyikan: 12 dtk (hemat baterai/kuota).
// Manfaat utama: livechat hidup di dalam proses Next.js — bila situs tampil,
// chat pasti berfungsi, termasuk setelah proses publish (sebelumnya
// mini-service :3003 berulang kali dibunuh OOM saat `next build`).
//
// Fitur tetap dipertahankan:
// - Tombol melayang kanan bawah + panel (mobile mendekati layar penuh)
// - Profil nama di localStorage, nada notifikasi bisa dimatikan
// - Tanda "Dibaca" pada pesan pengunjung + indikator admin sedang mengetik
// - MODE ADMIN otomatis (tanpa form sandi di widget): bila pemilik sudah
//   login di panel admin (#admin), token divalidasi dan widget menjadi
//   Konsol Admin untuk membalas pesan.
// - Penanganan keyboard virtual ponsel (visualViewport) — Task 50.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  Headset,
  LogOut,
  MessageCircle,
  SendHorizonal,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  chatHttpHistory,
  chatHttpInit,
  chatHttpRead,
  chatHttpSend,
  chatHttpTyping,
  chatHttpUnread,
  type PesanChat,
} from "@/lib/chatClient";
import { apakahNadaAktif, mainkanNadaPesanMasuk, setNadaAktif } from "@/lib/sound";
import { clearToken, getToken } from "@/lib/client";
import { useChatAdmin } from "@/store/chatAdmin";
import { WidgetAdminChat } from "./WidgetAdminChat";

const KUNCI_NAMA = "b2b_chat_nama";
const KUNCI_CONV = "b2b_chat_conv";

type Status = "menyambung" | "aktif" | "gangguan";

function jamTampil(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatWidget({ supplierName }: { supplierName: string }) {
  const [terbuka, setTerbuka] = useState(false);
  const [nama, setNama] = useState<string>("");
  const [convId, setConvId] = useState<string>("");
  const [pesan, setPesan] = useState<PesanChat[]>([]);
  const [status, setStatus] = useState<Status>("menyambung");
  const [teks, setTeks] = useState("");
  const [mengetikAdmin, setMengetikAdmin] = useState(false);
  const [dibacaOlehAdmin, setDibacaOlehAdmin] = useState(false);
  const [belumDibaca, setBelumDibaca] = useState(0);
  const [nadaAktif, setNadaAktifState] = useState(true);
  const [sedangKirim, setSedangKirim] = useState(false);
  const [gagalKirim, setGagalKirim] = useState(false);
  // Gagal memulai chat — tampil hanya setelah semua percobaan ulang habis.
  const [gagalMulai, setGagalMulai] = useState(false);
  const [percobaanMulai, setPercobaanMulai] = useState(0);
  // Keyboard virtual ponsel (lihat efek visualViewport di bawah)
  const [angkatKeyboard, setAngkatKeyboard] = useState(0);
  const [fokusKetik, setFokusKetik] = useState(false);

  // Mode admin di dalam widget (lihat WidgetAdminChat).
  const adminTotalBelum = useChatAdmin((s) => s.totalBelum);
  const adminStatus = useChatAdmin((s) => s.status);
  const [adminAktif, setAdminAktif] = useState(false);

  const convRef = useRef("");
  const terbukaRef = useRef(false);
  const lastIdRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terakhirTypingKirimRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ---------- gabung pesan ----------
  // Gabung (bukan timpa) agar gelembung sementara pesan yang sedang dikirim
  // tidak hilang ditarik ulang di tengah jalan. Pesan tmp (id "tmp-…")
  // digantikan pesan asli dari server saat tersedia.
  const urutkanDanSet = useCallback((daftar: PesanChat[]) => {
    setPesan((sebelumnya) => {
      const gabung = [...sebelumnya];
      for (const p of daftar) {
        const idxTmp = gabung.findIndex(
          (x) =>
            typeof x.id === "string" &&
            x.id.startsWith("tmp-") &&
            (p.clientTmpId ? p.clientTmpId === x.id : x.text === p.text && p.sender === "pengunjung")
        );
        if (idxTmp >= 0) gabung[idxTmp] = p;
        else if (!gabung.some((x) => x.id === p.id)) gabung.push(p);
      }
      return gabung.sort((a, b) => Number(a.id) - Number(b.id));
    });
  }, []);

  const resetSesi = useCallback(() => {
    convRef.current = "";
    setConvId("");
    setPesan([]);
    lastIdRef.current = 0;
    setBelumDibaca(0);
    try {
      window.localStorage.removeItem(KUNCI_CONV);
    } catch {
      // abaikan
    }
  }, []);

  // ---------- polling ----------
  const tarikPesan = useCallback(
    async (id: string, penuh = false) => {
      try {
        const since = penuh ? 0 : lastIdRef.current;
        const res = await chatHttpHistory(id, since);
        setStatus("aktif");
        if (!res.ok) return;
        setMengetikAdmin(res.adminMengetik);
        setDibacaOlehAdmin(res.dibacaOlehAdmin);
        if (res.messages.length) {
          urutkanDanSet(res.messages);
          lastIdRef.current = Math.max(lastIdRef.current, res.lastId);
          const balasanAdmin = res.messages.some((m) => m.sender === "admin");
          if (balasanAdmin && terbukaRef.current) {
            // Panel terbuka → tandai langsung dibaca.
            void chatHttpRead(id, "pengunjung").catch(() => {});
          } else if (balasanAdmin && !terbukaRef.current) {
            setBelumDibaca((n) => n + res.messages.filter((m) => m.sender === "admin").length);
            mainkanNadaPesanMasuk("pengunjung");
          }
        }
      } catch (e) {
        // Percakapan sudah dihapus admin (404) → reset sesi pengunjung.
        if (e instanceof Error && e.message.includes("tidak ditemukan")) {
          resetSesi();
          return;
        }
        setStatus((s) => (s === "menyambung" ? s : "gangguan"));
      }
    },
    [urutkanDanSet, resetSesi]
  );

  // ---------- pemulihan sesi ----------
  // Nama + percakapan pengunjung disimpan di localStorage — dipulihkan saat
  // widget terpasang sehingga percakapan lama tetap tersambung setelah
  // halaman dimuat ulang (pesan ditangguhkan tetap tampil via polling).
  useEffect(() => {
    let namaTersimpan = "";
    let convTersimpan = "";
    try {
      namaTersimpan = window.localStorage.getItem(KUNCI_NAMA) || "";
      convTersimpan = window.localStorage.getItem(KUNCI_CONV) || "";
    } catch {
      // abaikan
    }
    setNama(namaTersimpan);
    setNadaAktifState(apakahNadaAktif("pengunjung"));
    if (convTersimpan) {
      convRef.current = convTersimpan;
      setConvId(convTersimpan);
    }
  }, []);

  // Loop polling: ritme menyesuaikan keadaan panel & tab.
  useEffect(() => {
    if (!convId) return;
    let hidup = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const langkah = () => {
      if (!hidup) return;
      const tersembunyi = typeof document !== "undefined" && document.hidden;
      void tarikPesan(convRef.current);
      // Badge saat panel tertutup memakai endpoint `unread` yang murah.
      if (!terbukaRef.current) {
        void chatHttpUnread(convRef.current)
          .then((r) => {
            if (hidup) setBelumDibaca(r.count);
          })
          .catch(() => {});
      }
      const jeda = terbukaRef.current ? (tersembunyi ? 12000 : 2000) : tersembunyi ? 12000 : 6000;
      timer = setTimeout(langkah, jeda);
    };

    // Muat penuh saat sesi percakapan baru terpasang.
    void tarikPesan(convId, true);
    timer = setTimeout(langkah, 2000);

    return () => {
      hidup = false;
      if (timer) clearTimeout(timer);
    };
  }, [convId, tarikPesan]);

  // ---------- keyboard virtual ponsel ----------
  // Panel chat menempel di dasar layar (position: fixed). Di ponsel fisik,
  // keyboard virtual MENUTUPI kolom ketik — iOS Safari ditangani dengan
  // mengangkat panel mengikuti visualViewport selama kolom ketik fokus.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const hitung = () => {
      const tumpang = Math.round(window.innerHeight - vv.offsetTop - vv.height);
      setAngkatKeyboard(tumpang > 120 ? tumpang : 0);
    };
    hitung();
    vv.addEventListener("resize", hitung);
    vv.addEventListener("scroll", hitung);
    return () => {
      vv.removeEventListener("resize", hitung);
      vv.removeEventListener("scroll", hitung);
    };
  }, []);
  const panelTerangkat = fokusKetik && angkatKeyboard > 0;

  // ---------- aksi ----------
  const bukaPanel = () => {
    setTerbuka(true);
    terbukaRef.current = true;
    setBelumDibaca(0);
    if (convId) void chatHttpRead(convId, "pengunjung").catch(() => {});
    // Pemilik yang pernah login panel admin: pastikan mode admin terdeteksi
    // (juga mencoba ulang bila validasi awal gagal karena gangguan jaringan).
    if (!adminAktif) void cekSesiAdmin();
    // Fokus otomatis HANYA di perangkat pointer halus (desktop).
    window.setTimeout(() => {
      if (window.matchMedia?.("(pointer: fine)")?.matches) inputRef.current?.focus();
    }, 250);
  };

  const tutupPanel = () => {
    setTerbuka(false);
    terbukaRef.current = false;
  };

  // ---------- mode admin ----------
  useEffect(() => {
    useChatAdmin.getState().setPanelAktif(adminAktif && terbuka);
  }, [adminAktif, terbuka]);

  // Sesi admin berakhir (token ditimpa login lain / dihapus server):
  // polling sudah dihentikan store — keluar dari mode admin dengan anggun
  // sehingga widget kembali ke tampilan pengunjung (dulu: menggantung
  // di mode admin dengan status gangguan selamanya).
  useEffect(() => {
    if (adminStatus === "berakhir" && adminAktif) {
      setAdminAktif(false);
      setNadaAktifState(apakahNadaAktif("pengunjung"));
    }
  }, [adminStatus, adminAktif]);

  useEffect(() => {
    return () => {
      if (useChatAdmin.getState().panelAktif) {
        useChatAdmin.getState().setPanelAktif(false);
      }
    };
  }, []);

  const masukModeAdmin = useCallback(() => {
    useChatAdmin.getState().mulai();
    setAdminAktif(true);
    setNadaAktifState(apakahNadaAktif("admin"));
  }, []);

  // Deteksi sesi admin TANPA form sandi di widget: token tersimpan dari
  // panel admin (#admin) divalidasi ke daftar percakapan (same-origin).
  const cekSesiAdmin = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch("/api/chat/conversations", {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        clearToken();
        return false;
      }
      if (!res.ok) return false;
      masukModeAdmin();
      return true;
    } catch {
      return false;
    }
  }, [masukModeAdmin]);

  useEffect(() => {
    void cekSesiAdmin();
  }, [cekSesiAdmin]);

  const keluarAdmin = async () => {
    const token = getToken();
    try {
      await fetch("/api/admin/login", {
        method: "DELETE",
        headers: token ? { "x-admin-token": token } : undefined,
      });
    } catch {
      // abaikan
    }
    clearToken();
    useChatAdmin.getState().berhenti();
    setAdminAktif(false);
    setNadaAktifState(apakahNadaAktif("pengunjung"));
  };

  const mulaiChatDenganNama = async (e: React.FormEvent) => {
    e.preventDefault();
    const bersih = nama.trim();
    if (!bersih || sedangKirim) return;
    setSedangKirim(true);
    setGagalMulai(false);
    try {
      // Panggilan same-origin ke Next.js sendiri — jaringan gangguan sesaat
      // dijembatani dengan percobaan ulang menanjak (total ±25 dtk).
      let id = "";
      const jedaUlang = [2000, 3000, 4000, 5000, 5000, 6000];
      for (let coba = 0; coba < 6 && !id; coba++) {
        try {
          id = (await chatHttpInit(bersih)).conversationId;
        } catch {
          setPercobaanMulai(coba + 1);
          if (coba < 5) await new Promise((r) => setTimeout(r, jedaUlang[coba]));
        }
      }
      if (!id) throw new Error("init gagal");
      convRef.current = id;
      setConvId(id);
      setPesan([]);
      lastIdRef.current = 0;
      setStatus("menyambung");
      try {
        window.localStorage.setItem(KUNCI_NAMA, bersih);
        window.localStorage.setItem(KUNCI_CONV, id);
      } catch {
        // abaikan
      }
      window.setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      // Server tidak terjangkau — beri tahu pengunjung agar mencoba lagi.
      setGagalMulai(true);
    } finally {
      setPercobaanMulai(0);
      setSedangKirim(false);
    }
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    const bersih = teks.trim();
    if (!bersih || !convId || sedangKirim) return;
    const tmp: PesanChat = {
      id: `tmp-${Date.now()}`,
      conversationId: convId,
      sender: "pengunjung",
      text: bersih,
      createdAt: Date.now(),
    };
    setPesan((sebelumnya) => [...sebelumnya, tmp]);
    setTeks("");
    setGagalKirim(false);
    setSedangKirim(true);
    void chatHttpTyping(convId, "pengunjung", false).catch(() => {});

    // Idempoten di server (clientTmpId) — aman mencoba ulang.
    let terkirim = false;
    for (let coba = 0; coba < 3 && !terkirim; coba++) {
      try {
        const res = await chatHttpSend(convId, bersih, tmp.id);
        urutkanDanSet([res.message]);
        lastIdRef.current = Math.max(lastIdRef.current, Number(res.message.id) || 0);
        terkirim = true;
      } catch {
        if (coba < 2) await new Promise((r) => setTimeout(r, 3000));
      }
    }
    if (!terkirim) setGagalKirim(true);
    setSedangKirim(false);
  };

  const saatMengetik = (nilai: string) => {
    setTeks(nilai);
    if (!convId) return;
    const now = Date.now();
    if (now - terakhirTypingKirimRef.current > 2000) {
      terakhirTypingKirimRef.current = now;
      void chatHttpTyping(convId, "pengunjung", true).catch(() => {});
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      void chatHttpTyping(convRef.current, "pengunjung", false).catch(() => {});
    }, 2500);
  };

  const ubahNada = () => {
    const baru = !nadaAktif;
    setNadaAktifState(baru);
    setNadaAktif(adminAktif ? "admin" : "pengunjung", baru);
  };

  // ---------- efek tampilan ----------
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pesan, mengetikAdmin, terbuka]);

  // Hapus tanda gagal kirim saat polling kembali menarik data (pulih).
  useEffect(() => {
    if (gagalKirim && status === "aktif") setGagalKirim(false);
  }, [status, gagalKirim]);

  const sudahPunyaConv = !!convId;
  const pesanPengunjungTerakhir = [...pesan].reverse().find((p) => p.sender === "pengunjung");

  return (
    <div className="print:hidden">
      {/* Tombol melayang */}
      {!terbuka && (
        <button
          onClick={bukaPanel}
          aria-label="Buka Live Chat"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bp-accent,#84BD00)] text-white shadow-xl transition hover:scale-105 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="h-7 w-7" />
          {adminAktif
            ? adminTotalBelum > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
                  {adminTotalBelum > 9 ? "9+" : adminTotalBelum}
                </span>
              )
            : belumDibaca > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
                  {belumDibaca > 9 ? "9+" : belumDibaca}
                </span>
              )}
        </button>
      )}

      {/* Panel chat */}
      {terbuka && (
        <div
          role="dialog"
          aria-label="Live Chat"
          onFocusCapture={() => setFokusKetik(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFokusKetik(false);
          }}
          style={panelTerangkat ? { bottom: `${angkatKeyboard + 8}px` } : undefined}
          className="fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] top-14 z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[540px] sm:w-[380px]"
        >
          {/* Kepala */}
          <div className="flex shrink-0 items-center gap-2.5 bg-[var(--bp-accent,#84BD00)] px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              {adminAktif ? <ShieldCheck className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold">{adminAktif ? "Konsol Admin" : "Live Chat"}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/90">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    (adminAktif ? adminStatus : status) === "aktif"
                      ? "bg-emerald-300"
                      : (adminAktif ? adminStatus : status) === "gangguan"
                        ? "bg-amber-300"
                        : (adminAktif ? adminStatus : status) === "berakhir"
                          ? "bg-neutral-400"
                          : "bg-white/60"
                  }`}
                />
                {adminAktif
                  ? adminStatus === "berakhir"
                    ? "Sesi berakhir — masuk kembali dari panel admin"
                    : adminStatus === "gangguan"
                      ? "Gangguan — mencoba ulang otomatis"
                      : adminStatus === "aktif"
                        ? "Aktif — balas pesan pengunjung"
                        : "Menyambung…"
                  : status === "gangguan"
                    ? "Koneksi tersendat — menarik ulang otomatis"
                    : `Balasan cepat dari tim ${supplierName}`}
              </p>
            </div>
            <button
              onClick={ubahNada}
              aria-label={nadaAktif ? "Matikan nada notifikasi" : "Nyalakan nada notifikasi"}
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
            >
              {nadaAktif ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            {adminAktif && (
              <button
                onClick={keluarAdmin}
                aria-label="Keluar dari mode admin"
                title="Keluar dari mode admin"
                className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={tutupPanel}
              aria-label="Tutup chat"
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {adminAktif ? (
            /* Konsol admin: daftar percakapan + utas balasan */
            <WidgetAdminChat />
          ) : !sudahPunyaConv ? (
            /* Form nama */
            <form
              onSubmit={mulaiChatDenganNama}
              className="flex flex-1 flex-col justify-center gap-3 px-6 pb-10"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bp-accent-soft,#f2f8e5)] text-[var(--bp-accent,#84BD00)]">
                <Headset className="h-7 w-7" />
              </span>
              <h3 className="text-center text-base font-bold text-neutral-900">
                Halo! Ada yang bisa kami bantu?
              </h3>
              <p className="text-center text-sm text-neutral-500">
                Tulis nama Anda untuk memulai percakapan dengan tim {supplierName}.
              </p>
              {gagalMulai && (
                <p className="text-center text-xs text-red-600" role="alert">
                  Gagal memulai chat. Server sedang gangguan — tunggu beberapa
                  detik lalu coba lagi.
                </p>
              )}
              {!gagalMulai && percobaanMulai > 0 && (
                <p className="text-center text-xs text-amber-600" role="status">
                  Server sedang gangguan — menghubungkan ulang otomatis
                  (percobaan {percobaanMulai}/6)…
                </p>
              )}
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Anda…"
                maxLength={60}
                enterKeyHint="go"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--bp-accent,#84BD00)] focus:ring-2 focus:ring-[var(--bp-accent-soft,#f2f8e5)]"
              />
              <button
                type="submit"
                disabled={!nama.trim() || sedangKirim}
                className="w-full rounded-lg bg-[var(--bp-accent,#84BD00)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {sedangKirim ? "Menyiapkan…" : "Mulai Chat"}
              </button>
            </form>
          ) : (
            <>
              {/* Pesan */}
              <div
                ref={scrollRef}
                className="nice-scroll min-h-0 flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-3"
              >
                {pesan.length === 0 && (
                  <p className="mt-6 text-center text-xs text-neutral-400">
                    Belum ada pesan. Sapa kami dulu! 👋
                  </p>
                )}
                {pesan.map((p) =>
                  p.sender === "pengunjung" ? (
                    <div key={p.id} className="flex flex-col items-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--bp-accent,#84BD00)] px-3.5 py-2 text-sm text-white shadow-sm">
                        <p className="whitespace-pre-wrap break-words">{p.text}</p>
                        <p className="mt-0.5 text-right text-[10px] text-white/70">
                          {jamTampil(p.createdAt)}
                        </p>
                      </div>
                      {p.id === pesanPengunjungTerakhir?.id &&
                        typeof p.id === "number" &&
                        dibacaOlehAdmin && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
                            <CheckCheck className="h-3 w-3 text-[var(--bp-accent,#84BD00)]" /> Dibaca
                          </span>
                        )}
                    </div>
                  ) : (
                    <div key={p.id} className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 shadow-sm">
                        <p className="whitespace-pre-wrap break-words">{p.text}</p>
                        <p className="mt-0.5 text-right text-[10px] text-neutral-400">
                          {jamTampil(p.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                )}
                {mengetikAdmin && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3.5 py-2 text-xs italic text-neutral-500 shadow-sm">
                      Admin sedang mengetik…
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={kirim} className="shrink-0 border-t border-neutral-200 bg-white p-2.5">
                {gagalKirim && (
                  <p className="mb-1.5 text-[11px] text-red-600">
                    Gagal mengirim pesan. Periksa koneksi lalu coba lagi.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={teks}
                    onChange={(e) => saatMengetik(e.target.value)}
                    placeholder="Tulis pesan…"
                    maxLength={2000}
                    enterKeyHint="send"
                    className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--bp-accent,#84BD00)] focus:ring-2 focus:ring-[var(--bp-accent-soft,#f2f8e5)]"
                  />
                  <button
                    type="submit"
                    disabled={!teks.trim() || sedangKirim}
                    aria-label="Kirim pesan"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent,#84BD00)] text-white transition hover:opacity-90 disabled:opacity-40"
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
