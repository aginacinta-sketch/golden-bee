"use client";

/**
 * AdminChatPanel — komponen BERSAMA sisi ADMIN live chat: daftar percakapan
 * pengunjung + panel balasan realtime. Tersambung ke chat service (socket.io)
 * via gateway: io('/?XTransformPort=3003'), diautentikasi dengan token sesi
 * admin. Dipakai di dua tempat:
 *  - variant="panel"  → tab "Live Chat" di panel admin (daftar percakapan
 *    SELALU tampak berdampingan dengan utas balasan di semua ukuran layar,
 *    lengkap dengan judul halaman & status koneksi).
 *  - variant="widget" → widget mengambang live chat di website publik ketika
 *    dibuka oleh admin yang sedang masuk (satu kolom kompak, tinggi mengikuti
 *    induk, judul halaman tidak ikut — sudah disediakan widget).
 *
 * Bila socket tidak tersedia (aplikasi di-publish), probe otomatis beralih
 * PERMANEN ke jalur HTTP (/api/chat/*) dengan polling 3 detik — daftar,
 * riwayat thread terbuka, badge belum dibaca, dentang notifikasi, tandai
 * dibaca, balas, dan hapus percakapan semuanya bekerja.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, MessagesSquare, SendHorizontal, Trash2, Users } from "lucide-react";
import {
  balasAdmin,
  daftarPercakapanAdmin,
  hapusAdmin,
  hapusSemuaAdmin,
  kirimMengetikAdmin,
  riwayatAdmin,
  tandaiDibacaAdmin,
  type ChatMsg,
  type Percakapan,
} from "@/lib/chatHttp";
import { getToken } from "@/lib/client";
import { mainkanNadaPesanMasuk } from "@/lib/sound";
import { TombolNada } from "@/components/chat/TombolNada";
import { toast } from "@/hooks/use-toast";

const SERVICE_URL = "/?XTransformPort=3003";
/** Batas waktu probe socket — setelah itu beralih permanen ke jalur HTTP. */
const PROBE_SOCKET_MS = 4500;
const INTERVAL_POLL_HTTP_MS = 3000;

// Bentuk data diambil dari chatHttp agar konsisten dengan jalur HTTP.
type Conversation = Percakapan;

function jam(ts: number) {
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function waktuSingkat(ts: number) {
  const d = new Date(ts);
  const kini = new Date();
  return d.toDateString() === kini.toDateString()
    ? jam(ts)
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

interface Props {
  variant: "panel" | "widget";
  /** Dipanggil tiap jumlah belum dibaca berubah — untuk badge bubble widget. */
  onUnreadChange?: (total: number) => void;
  /** Bila false (panel widget tersembunyi), pesan baru TIDAK otomatis
   * ditandai terbaca sehingga badge belum dibaca tetap tampil. */
  terlihat?: boolean;
}

export function AdminChatPanel({ variant, onUnreadChange, terlihat }: Props) {
  const panel = variant === "panel";
  const [connected, setConnected] = useState(false);
  const [authGagal, setAuthGagal] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [pengunjungMengetik, setPengunjungMengetik] = useState(false);
  // Permintaan hapus yang menunggu konfirmasi: satu percakapan atau semuanya.
  const [konfirmasi, setKonfirmasi] = useState<
    { jenis: "satu"; conv: Conversation } | { jenis: "semua" } | null
  >(null);

  const socketRef = useRef<Socket | null>(null);
  // Jalur data: "socket" (chat-service tersedia) atau "http" (polling
  // /api/chat/* — dipakai saat aplikasi di-publish tanpa chat-service).
  const [jalur, setJalur] = useState<"socket" | "http">("socket");
  const terhubungRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active]);
  const terlihatRef = useRef(terlihat !== false);
  useEffect(() => {
    terlihatRef.current = terlihat !== false;
    // Panel kembali terlihat dengan percakapan terbuka → tandai terbaca.
    if (terlihat !== false && active?.id) {
      if (jalur === "http") tandaiDibacaAdmin(active.id);
      else socketRef.current?.emit("chat:open", { conversationId: active.id });
    }
  }, [terlihat, active?.id, jalur]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    let probe: number | undefined;
    let jembatan: number | undefined;
    const s = io(SERVICE_URL, {
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
      setAuthGagal(false);
      s.emit("admin:auth", { token: getToken() }, (res: { ok: boolean; conversations?: Conversation[] }) => {
        if (res?.ok && res.conversations) {
          setConversations(res.conversations);
        } else {
          setAuthGagal(true);
        }
      });
    });
    s.on("disconnect", () => {
      terhubungRef.current = false;
      setConnected(false);
    });
    s.on("chat:conversations", (d: { conversations: Conversation[] }) => setConversations(d.conversations));
    s.on("chat:message", (row: ChatMsg) => {
      // Tampilkan pesan di panel bila percakapannya sedang dibuka
      // (termasuk gema balasan admin sendiri).
      if (activeIdRef.current === row.conversationId) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
      if (row.sender !== "visitor") return;
      mainkanNadaPesanMasuk("admin");
      // Percakapan yang sedang dibuka: tandai langsung terbaca — HANYA bila
      // panel benar-benar terlihat (widget tersembunyi tetap menghitung
      // belum dibaca agar badge muncul).
      if (activeIdRef.current === row.conversationId) {
        setPengunjungMengetik(false);
        if (terlihatRef.current) {
          s.emit("chat:open", { conversationId: row.conversationId });
        }
      }
    });
    s.on("chat:typing-visitor", (d: { conversationId: string; typing: boolean }) => {
      if (d.conversationId === activeIdRef.current) setPengunjungMengetik(!!d.typing);
    });
    // Percakapan dihapus (oleh sesi admin mana pun): tutup thread terbuka
    // bila bersangkutan. Daftar percakapan diperbarui otomatis via broadcast.
    s.on("chat:conversation-deleted", (d: { conversationId?: string; all?: boolean }) => {
      if (d?.all || activeIdRef.current === d?.conversationId) {
        setActive(null);
        setMessages([]);
        setPengunjungMengetik(false);
      }
    });

    // Jembatan mode campuran: pesan bisa juga ditulis lewat jalur HTTP oleh
    // pengunjung yang socketnya gagal — segarkan daftar + thread terbuka
    // secara berkala agar panel ber-socket tetap melihatnya (dan hapusan).
    jembatan = window.setInterval(() => {
      if (!terhubungRef.current) return;
      s.emit("chat:list", (r: { ok?: boolean; conversations?: Conversation[] }) => {
        if (r?.ok && r.conversations) setConversations(r.conversations);
      });
      const cid = activeIdRef.current;
      if (cid) {
        s.emit("chat:history", { conversationId: cid }, (res: { ok: boolean; messages?: ChatMsg[] }) => {
          if (res?.ok && res.messages && activeIdRef.current === cid) {
            setMessages((prev) => {
              const gabungan = [...prev];
              for (const m of res.messages!) {
                if (!gabungan.some((x) => x.id === m.id)) gabungan.push(m);
              }
              gabungan.sort((a, b) => a.createdAt - b.createdAt);
              return gabungan;
            });
          }
        });
      }
    }, 10000);

    // Probe: socket belum tersambung dalam batas waktu (aplikasi di-publish
    // tanpa chat-service) → beralih permanen ke jalur HTTP.
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
      if (jembatan) window.clearInterval(jembatan);
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Jalur HTTP (aplikasi di-publish): siklus polling /api/chat/* — daftar
  // percakapan + badge belum dibaca + indikator mengetik + riwayat thread
  // terbuka + deteksi percakapan yang dihapus admin lain.
  useEffect(() => {
    if (jalur !== "http") return;
    let batal = false;
    let threadCid: string | null = null;
    let threadDikenal = new Set<string>(); // id pesan thread terbuka (untuk dentang)
    let sigPesan = ""; // penanda isi thread — hindari render ulang & deteksi hapus
    // Basis "belum dibaca" per percakapan — untuk dentang pesan masuk pada
    // percakapan LAIN / percakapan BARU (bukan thread yang sedang dibuka).
    let unreadSebelumnya = new Map<string, number>();
    let sudahBasisUnread = false;

    const siklus = async () => {
      try {
        const daftar = await daftarPercakapanAdmin();
        if (batal) return;
        if (daftar === null) {
          setAuthGagal(true);
          setConnected(false);
          return;
        }
        setConnected(true);
        setConversations(daftar.conversations);
        // Dentang "percakapan masuk" jalur HTTP: pesan baru pada percakapan
        // LAIN atau percakapan BARU (thread yang sedang dibuka ditangani
        // jalur riwayat di bawah agar tidak dentang ganda).
        const cidAktif = activeIdRef.current;
        const petaBaru = new Map<string, number>();
        let adaMasuk = false;
        for (const c of daftar.conversations) {
          petaBaru.set(c.id, c.unread || 0);
          if (c.id !== cidAktif && (c.unread || 0) > (unreadSebelumnya.get(c.id) ?? 0)) {
            adaMasuk = true;
          }
        }
        if (sudahBasisUnread && adaMasuk) mainkanNadaPesanMasuk("admin");
        sudahBasisUnread = true;
        unreadSebelumnya = petaBaru;
        const cid = activeIdRef.current;
        setPengunjungMengetik(!!cid && daftar.typingVisitor.includes(cid));
        if (!cid) {
          threadCid = null;
          sigPesan = "";
          return;
        }
        if (cid !== threadCid) {
          threadCid = cid;
          threadDikenal = new Set();
          sigPesan = "";
        }
        const h = await riwayatAdmin(cid);
        if (batal || activeIdRef.current !== cid) return;
        const sig = h.messages.map((m) => m.id).join("|");
        if (sig !== sigPesan) {
          // Pesan pengunjung baru pada thread yang dibuka → dentang + tanda baca
          // bila panel benar-benar terlihat (sama seperti alur socket).
          const pengunjungBaru = h.messages.filter(
            (m) => m.sender === "visitor" && !threadDikenal.has(m.id)
          );
          if (threadDikenal.size > 0 && pengunjungBaru.length > 0) {
            mainkanNadaPesanMasuk("admin");
            if (terlihatRef.current) tandaiDibacaAdmin(cid);
          }
          for (const m of h.messages) threadDikenal.add(m.id);
          sigPesan = sig;
          setMessages(h.messages);
          setPengunjungMengetik(false);
        }
        // Percakapan dihapus admin lain (hapus satu / Bersihkan semua):
        // thread terbuka tadi punya isi, kini total 0 → tutup thread.
        if (h.total === 0 && threadDikenal.size > 0) {
          setActive(null);
          setMessages([]);
          setPengunjungMengetik(false);
          threadCid = null;
          threadDikenal = new Set();
          sigPesan = "";
        }
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
  }, [jalur]);

  // Gulir otomatis ke pesan terbaru.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pengunjungMengetik]);

  const totalBelum = conversations.reduce((a, c) => a + (c.unread || 0), 0);
  useEffect(() => {
    onUnreadChange?.(totalBelum);
  }, [totalBelum, onUnreadChange]);

  const bukaPercakapan = useCallback(
    (conv: Conversation) => {
      setActive(conv);
      setPengunjungMengetik(false);
      setInput("");
      if (jalur === "http") {
        setMessages([]);
        tandaiDibacaAdmin(conv.id);
        void riwayatAdmin(conv.id).then((h) => {
          if (activeIdRef.current !== conv.id) return;
          setMessages(h.messages);
        });
        return;
      }
      socketRef.current?.emit("chat:open", { conversationId: conv.id });
      socketRef.current?.emit("chat:history", { conversationId: conv.id }, (res: { ok: boolean; messages?: ChatMsg[] }) => {
        if (res?.ok && res.messages) setMessages(res.messages);
      });
    },
    [jalur]
  );

  const kirimTyping = useCallback(
    (mengetik: boolean) => {
      if (!active) return;
      if (jalur === "http") {
        kirimMengetikAdmin(active.id, mengetik);
        return;
      }
      if (!socketRef.current) return;
      socketRef.current.emit("chat:typing-admin", { conversationId: active.id, typing: mengetik });
    },
    [active, jalur]
  );

  const balas = async () => {
    const text = input.trim().slice(0, 2000);
    if (!text || !active || !connected) return;
    if (jalur === "http") {
      try {
        const row = await balasAdmin(active.id, text);
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      } catch {
        toast({ title: "Gagal mengirim balasan", description: "Periksa koneksi lalu coba lagi." });
        return;
      }
    } else {
      if (!socketRef.current) return;
      socketRef.current.emit("chat:reply", { conversationId: active.id, message: text });
    }
    setInput("");
    kirimTyping(false);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
  };

  const padaInput = (v: string) => {
    setInput(v);
    if (!active) return;
    kirimTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => kirimTyping(false), 1500);
  };

  const mintaHapus = (conv: Conversation) => setKonfirmasi({ jenis: "satu", conv });
  const mintaHapusSemua = () => setKonfirmasi({ jenis: "semua" });

  const jalankanHapus = async () => {
    const target = konfirmasi;
    if (!target) return;
    try {
      if (target.jenis === "satu") {
        if (jalur === "http") await hapusAdmin(target.conv.id);
        else
          socketRef.current?.emit("chat:delete-conversation", { conversationId: target.conv.id }, () => {});
        toast({ title: "Percakapan dihapus", description: `Percakapan dengan ${target.conv.name} telah dihapus permanen.` });
      } else {
        if (jalur === "http") await hapusSemuaAdmin();
        else socketRef.current?.emit("chat:delete-all", () => {});
        toast({ title: "Semua percakapan dihapus", description: "Seluruh riwayat live chat telah dibersihkan." });
      }
      // Jalur HTTP: segarkan daftar + tutup thread yang terhapus (broadcast
      // realtime tidak tersedia — listener socket menangani ini di mode socket).
      if (jalur === "http") {
        if (target.jenis === "semua" || activeIdRef.current === target.conv.id) {
          setActive(null);
          setMessages([]);
          setPengunjungMengetik(false);
        }
      }
    } catch {
      toast({ title: "Gagal menghapus", description: "Coba lagi sebentar." });
    }
    setKonfirmasi(null);
  };

  const judulHapus = konfirmasi?.jenis === "semua" ? "Bersihkan semua percakapan?" : "Hapus percakapan ini?";
  const ketHapus =
    konfirmasi?.jenis === "semua"
      ? "Seluruh pesan dan riwayat live chat akan dihapus permanen dari panel admin maupun sisi pengunjung. Tindakan ini tidak dapat dibatalkan."
      : konfirmasi
        ? `Seluruh pesan percakapan dengan ${konfirmasi.conv.name} akan dihapus permanen dari panel admin maupun sisi pengunjung. Tindakan ini tidak dapat dibatalkan.`
        : "";

  const isiChat = (
    <div
      className={`flex overflow-hidden bg-white ${
        panel
          ? "h-[560px] rounded-xl border border-neutral-200 shadow-sm"
          : "min-h-0 flex-1 flex-col"
      }`}
    >
      {/* Daftar percakapan — min-h-0 + flex-1: daftar mengisi sisa tinggi
          panel dan MENGGULIR DI DALAM dirinya; tanpa ini daftar panjang
          mendorong isi panel keluar batas (terpotong tak bisa dijangkau).
          Panel admin: daftar SELALU tampak berdampingan dengan utas —
          mengklik nama chat TIDAK menutup daftar ini. Widget publik:
          satu kolom, daftar & utas bergantian seperti semula. */}
      <div
        className={`chat-scroll min-h-0 overflow-y-auto border-neutral-200 ${
          panel
            ? "w-44 flex-none border-r sm:w-56 md:w-72"
            : `w-full flex-1 ${active ? "hidden" : "block"}`
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 border-b border-neutral-100 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            <Users className="h-3.5 w-3.5" /> Percakapan ({conversations.length})
          </p>
          {conversations.length > 0 && (
            <button
              onClick={mintaHapusSemua}
              aria-label="Hapus semua percakapan"
              title="Hapus semua percakapan"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" /> Bersihkan
            </button>
          )}
        </div>
        {conversations.length === 0 && (
          <p className="px-4 py-8 text-center text-xs leading-relaxed text-neutral-400">
            Belum ada percakapan.
            <br />
            Pesan dari widget live chat pengunjung akan muncul di sini.
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`flex w-full items-stretch border-b border-neutral-100 ${
              active?.id === c.id ? "bg-[var(--bp-accent-soft,#f4f9e6)]" : ""
            }`}
          >
            <button
              onClick={() => bukaPercakapan(c)}
              className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-neutral-900">{c.name}</span>
                  <span className="shrink-0 text-[10px] text-neutral-400">{waktuSingkat(c.lastAt)}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-neutral-500">{c.lastMessage}</span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
            <button
              onClick={() => mintaHapus(c)}
              aria-label={`Hapus percakapan ${c.name}`}
              title="Hapus percakapan"
              className="flex w-10 shrink-0 items-center justify-center text-neutral-300 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Panel percakapan aktif — min-h-0 WAJIB: tanpa itu kontainer
          mengembang mengikuti isi (bisa > tinggi panel) sehingga kepala
          percakapan & input terdorong keluar area terlihat; kolom pesan
          pun tak pernah menggulir sendiri. Dengan min-h-0 tingginya
          dipatok sisa panel dan daftar pesan menggulir di dalam.
          Panel admin: selalu flex (tampil di samping daftar, juga saat
          belum ada percakapan dipilih → placeholder); widget: hanya
          saat ada percakapan aktif. */}
      <div className={`min-w-0 min-h-0 flex-1 flex-col ${panel || active ? "flex" : "hidden"}`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <MessagesSquare className="h-10 w-10 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-400">Pilih percakapan untuk mulai membalas</p>
          </div>
        ) : (
          <>
            {/* Kepala percakapan */}
            <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActive(null)}
                aria-label="Kembali ke daftar"
                className={`h-8 w-8 shrink-0 ${panel ? "hidden" : ""}`}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent,#84BD00)] text-sm font-bold text-neutral-900">
                {active.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-bold text-neutral-900">{active.name}</p>
                <p className="text-[11px] text-neutral-400">Pengunjung website</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => mintaHapus(active)}
                aria-label="Hapus percakapan ini"
                title="Hapus percakapan"
                className="ml-auto h-8 w-8 shrink-0 text-neutral-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Pesan */}
            <div ref={scrollRef} className="chat-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-neutral-50 px-4 py-4">
              {messages.map((m) => {
                const dariAdmin = m.sender === "admin";
                return (
                  <div key={m.id} className={`flex ${dariAdmin ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
                        dariAdmin
                          ? "rounded-br-md bg-[var(--bp-accent,#84BD00)] text-neutral-900"
                          : "rounded-bl-md border border-neutral-200 bg-white text-neutral-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                      <p className={`mt-1 text-right text-[10px] ${dariAdmin ? "text-neutral-700/70" : "text-neutral-400"}`}>
                        {jam(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {pengunjungMengetik && (
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

            {/* Input balasan */}
            <div className="flex shrink-0 items-center gap-2 border-t border-neutral-200 p-3">
              <Input
                value={input}
                onChange={(e) => padaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    balas();
                  }
                }}
                placeholder={`Balas ${active.name}…`}
                aria-label="Tulis balasan"
                enterKeyHint="send"
                className="h-10 flex-1 rounded-full border-neutral-200 bg-neutral-50 text-base sm:text-sm focus-visible:ring-[var(--bp-accent,#84BD00)]"
                disabled={!connected}
              />
              <Button
                onClick={balas}
                disabled={!connected || !input.trim()}
                aria-label="Kirim balasan"
                className="h-10 shrink-0 rounded-full bg-[var(--bp-accent,#84BD00)] px-4 text-neutral-900 hover:brightness-95"
              >
                <SendHorizontal className="h-4 w-4" /> Kirim
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Konfirmasi hapus percakapan (portal — berlaku untuk kedua varian). */}
      <AlertDialog open={konfirmasi !== null} onOpenChange={(o) => { if (!o) setKonfirmasi(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{judulHapus}</AlertDialogTitle>
            <AlertDialogDescription>{ketHapus}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={jalankanHapus}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (panel) {
    // Varian penuh untuk tab panel admin: judul halaman + status koneksi.
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900">
              <MessagesSquare className="h-5 w-5 text-[var(--bp-accent,#84BD00)]" /> Live Chat
              {totalBelum > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                  {totalBelum} belum dibaca
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Balas pertanyaan pengunjung website secara realtime.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                connected && !authGagal ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected && !authGagal ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {authGagal ? "Sesi tidak berlaku" : connected ? "Tersambung" : "Menyambungkan…"}
            </span>
            <TombolNada sisi="admin" />
          </div>
        </div>

        {authGagal ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
            Sesi admin tidak berlaku. Silakan keluar lalu masuk kembali untuk menggunakan live chat.
          </div>
        ) : (
          isiChat
        )}
      </div>
    );
  }

  // Varian widget: tanpa judul halaman; hanya isi (daftar ↔ percakapan).
  if (authGagal) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-xs leading-relaxed text-neutral-500">
        Sesi admin tidak berlaku. Masuk kembali lewat menu Admin untuk membalas pesan pengunjung.
      </div>
    );
  }
  return isiChat;
}
