"use client";

/**
 * ChatWidget — live chat mengambang untuk situs katalog.
 * Tersambung ke chat service (socket.io) via gateway: io('/?XTransformPort=3003').
 * Dua mode otomatis:
 *  - PENGUNJUNG (bawaan): form nama sekali, percakapan pribadi via visitorId
 *    di localStorage, riwayat tersambung saat kembali lagi.
 *  - ADMIN: bila yang membuka situs adalah admin yang sedang masuk (token
 *    sesi valid), klik ikon live chat menampilkan panel balasan admin —
 *    daftar percakapan pengunjung + balas realtime, sama seperti tab
 *    "Live Chat" di panel admin (komponen bersama AdminChatPanel).
 *
 * Bila socket tidak tersambung (aplikasi di-publish tanpa chat-service),
 * probe 4,5 detik beralih PERMANEN ke jalur HTTP (/api/chat/*) — polling
 * 3 detik untuk riwayat, pesan baru, badge, dentang, mengetik, dan hapusan.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessagesSquare, SendHorizontal, X } from "lucide-react";
import { AdminChatPanel } from "@/components/chat/AdminChatPanel";
import {
  initPengunjung,
  kirimMengetikPengunjung,
  kirimPesanPengunjung,
  pollPengunjung,
  type ChatMsg,
} from "@/lib/chatHttp";
import { getToken } from "@/lib/client";
import { mainkanNadaPesanMasuk } from "@/lib/sound";
import { TombolNada } from "@/components/chat/TombolNada";
import { toast } from "@/hooks/use-toast";

const CHAT_IDENTITY_KEY = "b2b_chat_identity";
/** Batas waktu probe socket — setelah itu beralih permanen ke jalur HTTP. */
const PROBE_SOCKET_MS = 4500;
const INTERVAL_POLL_HTTP_MS = 3000;

type Identity = { visitorId: string; name: string };

function muatIdentitas(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHAT_IDENTITY_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Identity;
    return p.visitorId && p.name ? p : null;
  } catch {
    return null;
  }
}

function jam(ts: number) {
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Gaya aman keyboard ponsel: saat keyboard layar terbuka, viewport visual
 * menyusut (iOS: keyboard MENUTUPI viewport layout, bukan mengecekannya)
 * sehingga panel fixed di bawah layar tertelan keyboard — input tak terlihat
 * dan pengunjung merasa "tidak dapat mengetik". Hook ini mengangkat panel
 * DI ATAS keyboard dan memendekkan tingginya sesuai area yang terlihat.
 * Hanya aktif di perangkat nyata dengan keyboard layar (desktop = tanpa efek).
 */
function useGayaAmanKeyboard(): React.CSSProperties {
  const [gayaKb, setGayaKb] = useState<React.CSSProperties>({});
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const perbarui = () => {
      const keyboardPx = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (keyboardPx > 80) {
        // Keyboard terbuka: angkat panel di atasnya + sesuaikan tinggi ke area tampak
        const tinggiTampak = Math.round(vv.height);
        setGayaKb({ bottom: keyboardPx + 12, maxHeight: tinggiTampak - 32, height: Math.min(480, tinggiTampak - 32) });
      } else {
        setGayaKb({});
      }
    };
    vv.addEventListener("resize", perbarui);
    vv.addEventListener("scroll", perbarui);
    window.addEventListener("orientationchange", perbarui);
    return () => {
      vv.removeEventListener("resize", perbarui);
      vv.removeEventListener("scroll", perbarui);
      window.removeEventListener("orientationchange", perbarui);
    };
  }, []);
  return gayaKb;
}

export function ChatWidget({ supplierName }: { supplierName: string }) {
  // Identitas dimuat lazy sekali di klien — render awal (hanya bubble) identik
  // antara server dan klien sehingga aman dari hydration mismatch.
  const [identity, setIdentity] = useState<Identity | null>(() => muatIdentitas());
  const [namaInput, setNamaInput] = useState("");
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [adminMengetik, setAdminMengetik] = useState(false);
  // Mode widget: admin yang sedang masuk melihat panel balasan admin,
  // pengunjung biasa melihat form chat pengunjung. `sudahCek` mencegah
  // kedipan UI sebelum pemeriksaan sesi pertama selesai.
  const [modeAdmin, setModeAdmin] = useState(false);
  const [sudahCek, setSudahCek] = useState(false);
  const [unreadAdmin, setUnreadAdmin] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  // Gaya aman keyboard ponsel untuk semua panel mengambang (lihat hook di atas).
  const gayaAman = useGayaAmanKeyboard();
  // Jalur data chat: "socket" (chat-service tersedia, realtime) atau "http"
  // (polling /api/chat/* — dipakai saat aplikasi di-publish tanpa chat-service).
  const [jalur, setJalur] = useState<"socket" | "http">("socket");
  const terhubungRef = useRef(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);

  // Koneksi socket pengunjung — aktif setelah identitas tersedia dan HANYA
  // pada mode pengunjung (mode admin memakai koneksi AdminChatPanel sendiri).
  // Bila socket tak kunjung tersambung (aplikasi di-publish: chat-service
  // :3003 & gateway tidak ikut diterapkan), probe beralih permanen ke HTTP.
  useEffect(() => {
    if (!identity || modeAdmin) return;
    let probe: number | undefined;
    const s = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    });
    socketRef.current = s;

    s.on("connect", () => {
      if (probe) window.clearTimeout(probe);
      terhubungRef.current = true;
      setConnected(true);
      s.emit("chat:init", { visitorId: identity.visitorId, name: identity.name }, (res: { ok: boolean; messages?: ChatMsg[] }) => {
        if (res?.ok && res.messages) setMessages(res.messages);
      });
    });
    s.on("disconnect", () => {
      terhubungRef.current = false;
      setConnected(false);
    });
    s.on("chat:message", (row: ChatMsg) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      if (row.sender === "admin") {
        setAdminMengetik(false);
        // Nada notifikasi: balasan admin masuk — tetap berbunyi meski panel
        // terbuka (seperti aplikasi pesan pada umumnya); badge belum dibaca
        // hanya saat panel tertutup.
        mainkanNadaPesanMasuk("pengunjung");
        if (!openRef.current) setUnread((u) => u + 1);
      }
    });
    s.on("chat:typing-admin", (d: { typing: boolean }) => setAdminMengetik(!!d?.typing));
    // Percakapan dihapus admin: riwayat kosong kembali, sambut ulang pengunjung.
    s.on("chat:cleared", () => {
      setMessages([]);
      setUnread(0);
      toast({ title: "Percakapan dihapus", description: "Admin telah membersihkan riwayat percakapan ini." });
    });

    // Probe: socket belum tersambung dalam batas waktu → jalur HTTP.
    probe = window.setTimeout(() => {
      if (!terhubungRef.current) {
        s.disconnect();
        socketRef.current = null;
        setConnected(false);
        setJalur("http");
      }
    }, PROBE_SOCKET_MS);

    return () => {
      if (probe) window.clearTimeout(probe);
      s.disconnect();
      socketRef.current = null;
    };
  }, [identity, modeAdmin]);

  // Jalur HTTP (aplikasi di-publish): polling /api/chat/* — menggantikan
  // seluruh event socket (riwayat, pesan baru, mengetik, percakapan dihapus,
  // badge belum dibaca + dentang) dengan siklus ringan tiap 3 detik.
  useEffect(() => {
    if (jalur !== "http" || !identity || modeAdmin) return;
    let batal = false;
    let sejak = 0;
    let siklusPertama = true;
    let adaPesanServer = false;

    const siklus = async () => {
      try {
        const r = await pollPengunjung(identity.visitorId, sejak);
        if (batal) return;
        setConnected(true);
        if (r.messages.length > 0) {
          sejak = r.messages[r.messages.length - 1].createdAt;
          setMessages((prev) => {
            const gabungan = [...prev];
            for (const m of r.messages) {
              if (!gabungan.some((x) => x.id === m.id)) gabungan.push(m);
            }
            gabungan.sort((a, b) => a.createdAt - b.createdAt);
            return gabungan;
          });
        }
        if (siklusPertama) {
          siklusPertama = false;
          adaPesanServer = r.total > 0;
        } else {
          // Pesan admin baru → dentang notifikasi (panel terbuka maupun
          // tertutup); badge belum dibaca hanya saat panel tertutup.
          const adminBaru = r.messages.filter((m) => m.sender === "admin");
          if (adminBaru.length > 0) {
            mainkanNadaPesanMasuk("pengunjung");
            if (!openRef.current) setUnread((u) => u + adminBaru.length);
          }
          // Percakapan dibersihkan admin (total kembali 0 padahal ada isi).
          if (r.total === 0 && adaPesanServer) {
            adaPesanServer = false;
            setMessages([]);
            setUnread(0);
            toast({ title: "Percakapan dihapus", description: "Admin telah membersihkan riwayat percakapan ini." });
          } else if (r.total > 0) {
            adaPesanServer = true;
          }
        }
        setAdminMengetik(r.adminTyping);
      } catch {
        if (!batal) setConnected(false);
      }
    };

    siklus();
    const t = window.setInterval(siklus, INTERVAL_POLL_HTTP_MS);
    return () => {
      batal = true;
      window.clearInterval(t);
    };
  }, [jalur, identity, modeAdmin]);

  // Deteksi sesi admin: token valid di localStorage → mode admin.
  // Fungsi ini MURNI (tanpa setState); pemanggil yang menerapkan hasilnya.
  // Diperiksa sekali saat dipasang dan disegarkan tiap kali ikon diklik
  // (menangkap admin yang baru login/logout di tab yang sama).
  const cekModeAdmin = useCallback(async (): Promise<boolean | null> => {
    const token = getToken();
    if (!token) return false;
    try {
      // fetch langsung — TIDAK membersihkan token secara diam-diam.
      const res = await fetch("/api/admin/session", {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return null; // jaringan gagal — pemanggil mempertahankan mode saat ini
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    cekModeAdmin().then((hasil) => {
      if (cancelled) return;
      setSudahCek(true);
      if (hasil !== null) setModeAdmin(hasil);
    });
    return () => {
      cancelled = true;
    };
  }, [cekModeAdmin]);

  // Gulir otomatis ke pesan terbaru.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, adminMengetik, open]);

  const mulaiChat = () => {
    const nama = namaInput.trim().slice(0, 60);
    if (!nama) return;
    const next: Identity = { visitorId: crypto.randomUUID(), name: nama };
    localStorage.setItem(CHAT_IDENTITY_KEY, JSON.stringify(next));
    setIdentity(next);
    setOpen(true);
  };

  const kirimTyping = useCallback(
    (mengetik: boolean) => {
      if (!identity) return;
      if (jalur === "http") {
        kirimMengetikPengunjung(identity.visitorId, mengetik);
        return;
      }
      if (!socketRef.current) return;
      socketRef.current.emit("chat:typing", { visitorId: identity.visitorId, typing: mengetik });
    },
    [identity, jalur]
  );

  const kirim = async () => {
    const text = input.trim().slice(0, 2000);
    if (!text || !identity || !connected) return;
    if (jalur === "http") {
      try {
        const row = await kirimPesanPengunjung(identity.visitorId, identity.name, text);
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      } catch {
        toast({ title: "Gagal mengirim", description: "Periksa koneksi internet Anda lalu coba lagi." });
        return;
      }
    } else {
      if (!socketRef.current) return;
      socketRef.current.emit("chat:send", { visitorId: identity.visitorId, name: identity.name, message: text });
    }
    setInput("");
    kirimTyping(false);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
  };

  const padaInput = (v: string) => {
    setInput(v);
    if (!identity) return;
    kirimTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => kirimTyping(false), 1500);
  };

  const bukaPanel = () => {
    void cekModeAdmin().then((hasil) => {
      if (hasil !== null) setModeAdmin(hasil);
    });
    setOpen((o) => !o);
    if (!modeAdmin) setUnread(0);
  };

  return (
    <>
      {/* PANEL MODE ADMIN — panel balasan admin tetap terpasang (hanya
          disembunyikan saat tertutup) agar badge belum dibaca & dentang
          notifikasi tetap hidup, dan state percakapan tidak hilang. */}
      {modeAdmin && (
        <div
          role="dialog"
          aria-label="Live chat admin"
          style={gayaAman}
          className={
            open
              ? "fixed bottom-24 right-4 z-50 flex h-[480px] max-h-[calc(100dvh-160px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:right-6"
              : "hidden"
          }
        >
          {/* Kepala panel admin */}
          <div className="flex shrink-0 items-center gap-3 bg-[var(--bp-accent,#84BD00)] px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <MessagesSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold">Live Chat Admin</p>
              <p className="truncate text-[11px] text-white/85">Balas pesan pengunjung di sini</p>
            </div>
            <TombolNada sisi="admin" terang />
            <button
              onClick={bukaPanel}
              aria-label="Tutup chat"
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <AdminChatPanel variant="widget" onUnreadChange={setUnreadAdmin} terlihat={open} />
        </div>
      )}

      {/* Panel chat pengunjung */}
      {!modeAdmin && open && identity && (
        <div
          role="dialog"
          aria-label={`Live chat ${supplierName}`}
          style={gayaAman}
          className="fixed bottom-24 right-4 z-50 flex h-[480px] max-h-[calc(100dvh-160px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:right-6"
        >
          {/* Kepala panel */}
          <div className="flex shrink-0 items-center gap-3 bg-[var(--bp-accent,#84BD00)] px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <MessagesSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold">Chat {supplierName}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/85">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "bg-white" : "bg-white/40"}`} />
                {connected ? "Online — balasan cepat" : "Menyambungkan…"}
              </p>
            </div>
            <TombolNada sisi="pengunjung" terang />
            <button
              onClick={bukaPanel}
              aria-label="Tutup chat"
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Daftar pesan */}
          <div ref={scrollRef} className="chat-scroll flex-1 space-y-2.5 overflow-y-auto bg-neutral-50 px-3.5 py-3">
            {messages.length === 0 && (
              <div className="mt-8 text-center text-xs leading-relaxed text-neutral-500">
                <MessagesSquare className="mx-auto mb-2 h-7 w-7 text-neutral-300" />
                Halo {identity?.name}! 👋
                <br />
                Silakan sampaikan pertanyaan Anda seputar produk, harga, atau pengiriman — tim kami akan membalas di sini.
              </div>
            )}
            {messages.map((m) => {
              const milikSaya = m.sender === "visitor";
              return (
                <div key={m.id} className={`flex ${milikSaya ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
                      milikSaya
                        ? "rounded-br-md bg-[var(--bp-accent,#84BD00)] text-neutral-900"
                        : "rounded-bl-md border border-neutral-200 bg-white text-neutral-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={`mt-1 text-right text-[10px] ${milikSaya ? "text-neutral-700/70" : "text-neutral-400"}`}>
                      {jam(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            {adminMengetik && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white p-2.5">
            <Input
              value={input}
              onChange={(e) => padaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  kirim();
                }
              }}
              placeholder="Tulis pesan…"
              aria-label="Tulis pesan"
              enterKeyHint="send"
              className="h-10 flex-1 rounded-full border-neutral-200 bg-neutral-50 text-base sm:text-sm focus-visible:ring-[var(--bp-accent,#84BD00)]"
              disabled={!connected}
            />
            <Button
              size="icon"
              onClick={kirim}
              disabled={!connected || !input.trim()}
              aria-label="Kirim pesan"
              className="h-10 w-10 shrink-0 rounded-full bg-[var(--bp-accent,#84BD00)] text-neutral-900 hover:brightness-95"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bubble mengambang — desain menarik: gradien aksen, cahaya lembut,
          denyut halus, ikon bermorphing (chat ⇄ tutup), label sapaan hover. */}
      <div className="group fixed bottom-6 right-4 z-50 sm:right-6">
        {/* Label sapaan saat hover (hanya saat tertutup) */}
        {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-neutral-900/90 px-3.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          >
            {modeAdmin ? "Live Chat Admin" : `Chat dengan ${supplierName}`}
          </span>
        )}
        {/* Denyut halus mengundang perhatian (hormati preferensi reduced-motion) */}
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-[var(--bp-accent,#84BD00)] opacity-30 [animation-duration:2.6s] motion-reduce:animate-none"
          />
        )}
        <button
          onClick={bukaPanel}
          aria-label={open ? "Tutup live chat" : "Buka live chat"}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--bp-accent,#84BD00)] to-[var(--bp-accent-dark,#6D9A00)] text-white ring-1 ring-black/5 transition-transform duration-300 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bp-accent,#84BD00)] focus-visible:ring-offset-2"
          style={{
            boxShadow:
              "0 12px 28px -8px color-mix(in srgb, var(--bp-accent, #84BD00) 70%, transparent), 0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          {/* Ikon bermorphing halus: daftar chat ⇄ tutup */}
          <span aria-hidden className="relative block h-6 w-6">
            <MessagesSquare
              className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </span>
          {/* Badge belum dibaca — hidup dengan denyut lembut */}
          {!open && (modeAdmin ? unreadAdmin : unread) > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center">
              <span
                aria-hidden
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60 [animation-duration:1.8s] motion-reduce:animate-none"
              />
              <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {(modeAdmin ? unreadAdmin : unread) > 9 ? "9+" : modeAdmin ? unreadAdmin : unread}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* Form nama (sekali saja, mode pengunjung) */}
      {!modeAdmin && open && !identity && (
        <div
          style={{ bottom: gayaAman.bottom }}
          className="fixed bottom-24 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:right-6"
        >
          <p className="text-sm font-bold text-neutral-900">Mulai Live Chat</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Masukkan nama Anda untuk berbicara dengan tim {supplierName}.
          </p>
          <Input
            value={namaInput}
            onChange={(e) => setNamaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mulaiChat()}
            placeholder="Nama Anda…"
            aria-label="Nama Anda"
            enterKeyHint="send"
            autoFocus
            className="mt-3 h-10 text-base sm:text-sm"
          />
          <Button
            onClick={mulaiChat}
            disabled={!namaInput.trim()}
            className="mt-3 w-full bg-[var(--bp-accent,#84BD00)] text-neutral-900 hover:brightness-95"
          >
            <MessagesSquare className="h-4 w-4" /> Mulai Chat
          </Button>
        </div>
      )}
    </>
  );
}
