"use client";

// Tab "Live Chat" di panel admin: daftar percakapan pengunjung + utas balasan.
// Data & polling datang dari store useChatAdmin (same-origin, tanpa socket).
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Headset,
  Inbox,
  Loader2,
  MessageSquare,
  SendHorizonal,
  Trash2,
} from "lucide-react";
import { useChatAdmin } from "@/store/chatAdmin";
import type { PercakapanChat } from "@/lib/chatClient";

function jamTampil(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function waktuRelatif(ts: number) {
  try {
    const selisih = Date.now() - ts;
    if (selisih < 60_000) return "baru saja";
    if (selisih < 3600_000) return `${Math.floor(selisih / 60_000)} mnt lalu`;
    if (selisih < 86400_000) return `${Math.floor(selisih / 3600_000)} jam lalu`;
    return new Date(ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function potong(teks: string, maks = 42) {
  return teks.length > maks ? teks.slice(0, maks) + "…" : teks;
}

export function AdminLiveChat() {
  const status = useChatAdmin((s) => s.status);
  const daftar = useChatAdmin((s) => s.daftar);
  const pesan = useChatAdmin((s) => s.pesan);
  const terbukaId = useChatAdmin((s) => s.terbukaId);
  const mengetik = useChatAdmin((s) => s.mengetik);
  const pilih = useChatAdmin((s) => s.pilih);
  const balas = useChatAdmin((s) => s.balas);
  const hapus = useChatAdmin((s) => s.hapus);
  const kirimSedangMengetik = useChatAdmin((s) => s.kirimSedangMengetik);
  const setPanelAktif = useChatAdmin((s) => s.setPanelAktif);

  // Beri tahu store bahwa tab Live Chat sedang aktif (menentukan badge/tandai-baca).
  useEffect(() => {
    setPanelAktif(true);
    return () => setPanelAktif(false);
  }, [setPanelAktif]);

  const [teks, setTeks] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [konfirmHapus, setKonfirmHapus] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const terbuka: PercakapanChat | undefined = daftar.find((c) => c.id === terbukaId);
  const utas = terbukaId ? pesan[terbukaId] || [] : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [utas.length, mengetik, terbukaId]);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    const bersih = teks.trim();
    if (!bersih || mengirim) return;
    setMengirim(true);
    setTeks("");
    kirimSedangMengetik(false);
    const ok = await balas(bersih);
    setMengirim(false);
    if (!ok) setTeks(bersih); // gagal — kembalikan teks agar bisa kirim ulang
    inputRef.current?.focus();
  };

  const saatMengetik = (nilai: string) => {
    setTeks(nilai);
    if (!nilai.trim()) return;
    kirimSedangMengetik(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => kirimSedangMengetik(false), 2500);
  };

  const konfirmasiHapus = async () => {
    if (!terbukaId) return;
    setKonfirmHapus(false);
    await hapus(terbukaId);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900">
          <MessageSquare className="h-5 w-5 text-[var(--bp-accent,#84BD00)]" />
          Live Chat
        </h2>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-neutral-500">
          Balas pesan pengunjung secara langsung.
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                status === "aktif"
                  ? "bg-emerald-500"
                  : status === "gangguan"
                    ? "bg-amber-500"
                    : "bg-neutral-400"
              }`}
            />
            {status === "aktif"
              ? "Aktif (pembaruan tiap 2–3 dtk)"
              : status === "gangguan"
                ? "Gangguan — mencoba ulang otomatis"
                : "Menyambung…"}
          </span>
        </p>
      </div>

      <div className="flex h-[calc(100vh-230px)] min-h-[440px] gap-4">
        {/* Daftar percakapan */}
        <div
          className={`w-full shrink-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white md:w-80 md:border-r ${
            terbukaId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">Percakapan</p>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {daftar.length}
            </span>
          </div>
          <div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
            {status === "menyambung" && daftar.length === 0 && (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat percakapan…
              </div>
            )}
            {status !== "menyambung" && daftar.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Inbox className="h-8 w-8 text-neutral-300" />
                <p className="text-sm text-neutral-500">Belum ada pesan masuk.</p>
                <p className="text-xs text-neutral-400">
                  Percakapan dari widget Live Chat akan tampil di sini.
                </p>
              </div>
            )}
            {daftar.map((c) => {
              const aktif = c.id === terbukaId;
              return (
                <button
                  key={c.id}
                  onClick={() => pilih(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-neutral-100 px-4 py-3 text-left transition ${
                    aktif ? "bg-[var(--bp-accent-soft,#f2f8e5)]" : "hover:bg-neutral-50"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-600">
                    {c.nama.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-neutral-900">{c.nama}</span>
                      <span className="shrink-0 text-[10px] text-neutral-400">
                        {waktuRelatif(c.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-neutral-500">
                        {c.pesanTerakhir
                          ? `${c.pesanTerakhir.sender === "admin" ? "Anda: " : ""}${potong(c.pesanTerakhir.text)}`
                          : "Belum ada pesan"}
                      </span>
                      {c.unreadAdmin > 0 && (
                        <span className="shrink-0 rounded-full bg-[var(--bp-accent,#84BD00)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {c.unreadAdmin}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Utas percakapan */}
        <div
          className={`min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white ${
            terbukaId ? "flex" : "hidden md:flex"
          }`}
        >
          {!terbuka ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bp-accent-soft,#f2f8e5)] text-[var(--bp-accent,#84BD00)]">
                <Headset className="h-7 w-7" />
              </span>
              <p className="text-sm font-semibold text-neutral-700">Pilih percakapan</p>
              <p className="max-w-xs text-xs text-neutral-400">
                Pesan pengunjung masuk secara realtime. Pilih salah satu di kiri untuk mulai membalas.
              </p>
            </div>
          ) : (
            <>
              {/* Kepala utas */}
              <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-2.5 md:px-4">
                <button
                  onClick={() => pilih(null)}
                  aria-label="Kembali ke daftar percakapan"
                  className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600">
                  {terbuka?.nama.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-neutral-900">{terbuka?.nama}</p>
                  <p className="text-[11px] text-neutral-400">
                    {mengetik ? (
                      <span className="italic text-emerald-600">sedang mengetik…</span>
                    ) : (
                      "Pengunjung website"
                    )}
                  </p>
                </div>
                {konfirmHapus ? (
                  <span className="flex items-center gap-1.5">
                    <button
                      onClick={konfirmasiHapus}
                      className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => setKonfirmHapus(false)}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
                    >
                      Batal
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setKonfirmHapus(true)}
                    aria-label="Hapus percakapan"
                    title="Hapus percakapan"
                    className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Pesan */}
              <div
                ref={scrollRef}
                className="nice-scroll min-h-0 flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-3 md:p-4"
              >
                {utas.length === 0 && (
                  <p className="mt-8 text-center text-xs text-neutral-400">Memuat pesan…</p>
                )}
                {utas.map((p) =>
                  p.sender === "admin" ? (
                    <div key={p.id} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--bp-accent,#84BD00)] px-3.5 py-2 text-sm text-white shadow-sm">
                        <p className="whitespace-pre-wrap break-words">{p.text}</p>
                        <p className="mt-0.5 text-right text-[10px] text-white/70">
                          {jamTampil(p.createdAt)}
                        </p>
                      </div>
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
                {mengetik && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3.5 py-2 text-xs italic text-neutral-500 shadow-sm">
                      {terbuka?.nama} sedang mengetik…
                    </div>
                  </div>
                )}
              </div>

              {/* Input balasan */}
              <form
                onSubmit={kirim}
                className="flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white p-2.5 md:p-3"
              >
                <input
                  ref={inputRef}
                  value={teks}
                  onChange={(e) => saatMengetik(e.target.value)}
                  placeholder="Tulis balasan…"
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--bp-accent,#84BD00)] focus:ring-2 focus:ring-[var(--bp-accent-soft,#f2f8e5)]"
                />
                <button
                  type="submit"
                  disabled={!teks.trim() || mengirim}
                  aria-label="Kirim balasan"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent,#84BD00)] text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {mengirim ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-4 w-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
