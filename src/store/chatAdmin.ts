// Store chat admin (Task 52 — dibuat ulang): polling same-origin tanpa socket.
//
// Satu sumber data untuk seluruh panel admin (tab Live Chat di #admin dan
// Konsol Admin di dalam widget). Polling adaptif:
// - daftar percakapan  : tiap 3,5 dtk
// - utas yang terbuka  : tiap 2 dtk (inkremental via `since`)
// Status: "menyambung" → "aktif" (polling jalan) → "gangguan" (≥3 gagal
// beruntun; polling tetap dicoba — pulih otomatis).
import { create } from "zustand";
import { clearToken, getToken } from "@/lib/client";
import { mainkanNadaPesanMasuk } from "@/lib/sound";
import {
  chatHttpConversations,
  chatHttpDelete,
  chatHttpHistory,
  chatHttpRead,
  chatHttpReply,
  chatHttpTyping,
  KesalahanHttp,
  type PercakapanChat,
  type PesanChat,
} from "@/lib/chatClient";

// "berakhir" = token admin sudah tidak valid (401) — polling dihentikan
// dan pemilik sesi diminta masuk kembali dari panel admin (#admin).
export type StatusKoneksi = "menyambung" | "aktif" | "gangguan" | "berakhir";

type ChatAdminState = {
  status: StatusKoneksi;
  daftar: PercakapanChat[];
  pesan: Record<string, PesanChat[]>;
  terbukaId: string | null;
  mengetik: boolean; // pengunjung sedang mengetik di percakapan terbuka
  totalBelum: number;
  panelAktif: boolean; // tab Live Chat sedang dilihat admin?
  mulai: () => void;
  berhenti: () => void;
  pilih: (id: string | null) => void;
  balas: (teks: string) => Promise<boolean>;
  hapus: (id: string) => Promise<boolean>;
  kirimSedangMengetik: (aktif: boolean) => void;
  setPanelAktif: (v: boolean) => void;
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let siklus: ReturnType<typeof setInterval> | null = null; // loop ringan 500ms
let tokenSaatIni = "";
let timerMengetik: ReturnType<typeof setTimeout> | null = null;
let terakhirKirimMengetik = 0;
let sedangPoll = false;
let gagalBeruntun = 0;
// Id pesan terbaru yang pernah dilihat per percakapan — untuk deteksi
// "pesan baru" (suara/badge) dan penghapusan gelembung sementara.
const idTerlihat = new Map<string, number>();
// Utas yang sedang dibuka punya ritme polling lebih cepat (2 dtk).
let tickUtas = 0;

const hitungTotal = (daftar: PercakapanChat[]) =>
  daftar.reduce((acc, c) => acc + (c.unreadAdmin > 0 ? 1 : 0), 0);

function urutkan(daftar: PercakapanChat[]) {
  return [...daftar].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const useChatAdmin = create<ChatAdminState>((set, get) => {
  function setDaftar(daftar: PercakapanChat[]) {
    set({ daftar: urutkan(daftar), totalBelum: hitungTotal(daftar) });
  }

  function tambahPesan(conversationId: string, pesan: PesanChat) {
    const sekarang = get().pesan[conversationId] || [];
    if (sekarang.some((p) => p.id === pesan.id)) return;
    set({
      pesan: { ...get().pesan, [conversationId]: [...sekarang, pesan] },
    });
  }

  function gantiTmp(conversationId: string, tmpId: string, pesan: PesanChat) {
    const sekarang = get().pesan[conversationId] || [];
    const baru = sekarang
      .filter((p) => p.id !== tmpId && p.id !== pesan.id)
      .concat(pesan)
      .sort((a, b) => Number(a.id) - Number(b.id));
    set({ pesan: { ...get().pesan, [conversationId]: baru } });
  }

  /** Hentikan loop polling (tanpa mengosongkan status UI — pemanggil yang
   *  menentukan pesan akhir). Dipakai saat sesi admin berakhir (401). */
  function hentikanLoop() {
    if (siklus) {
      clearInterval(siklus);
      siklus = null;
    }
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    sedangPoll = false;
  }

  /** Satu putaran polling: daftar + utas terbuka. */
  async function pollSekali() {
    if (sedangPoll) return;
    // Token dibaca SEGAR tiap putaran: bila admin masuk ulang di tab yang
    // sama (token berotasi), polling langsung memakai token baru tanpa
    // perlu restart; token basi tidak akan dipakai berulang-ulang.
    const token = getToken() || tokenSaatIni;
    if (!token) return;
    if (token !== tokenSaatIni) {
      tokenSaatIni = token;
      gagalBeruntun = 0;
      if (get().status !== "aktif") set({ status: "aktif" });
    }
    sedangPoll = true;
    try {
      const res = await chatHttpConversations(tokenSaatIni);
      gagalBeruntun = 0;
      if (get().status !== "aktif") set({ status: "aktif" });

      // Deteksi pesan pengunjung baru → suara (kecuali utas itu sedang
      // dibuka dan panel aktif — dalam arti admin sedang melihatnya).
      const lama = get().daftar;
      for (const c of res.conversations || []) {
        const terlihatSebelumnya = idTerlihat.get(c.id) || 0;
        const idTerakhir = c.pesanTerakhir ? Number(c.pesanTerakhir.id) : 0;
        const baru =
          c.pesanTerakhir &&
          c.pesanTerakhir.sender === "pengunjung" &&
          idTerakhir > terlihatSebelumnya &&
          lama.some((x) => x.id === c.id); // percakapan lama (bukan baru dibuat)
        if (baru && !(get().panelAktif && get().terbukaId === c.id)) {
          mainkanNadaPesanMasuk("admin");
        }
        if (idTerakhir > terlihatSebelumnya) idTerlihat.set(c.id, idTerakhir);
      }

      setDaftar(res.conversations || []);

      // Utas terbuka: tarik inkremental tiap ±2 dtk (4 siklus × 500ms).
      const terbuka = get().terbukaId;
      if (terbuka) {
        tickUtas++;
        if (tickUtas % 4 === 0) {
          const sudah = get().pesan[terbuka] || [];
          const since = sudah.length
            ? Math.max(
                ...sudah.map((p) => (typeof p.id === "number" ? p.id : 0))
              )
            : 0;
          try {
            const r = await chatHttpHistory(terbuka, since);
            if (r.ok) {
              set({ mengetik: r.pengunjungMengetik });
              for (const m of r.messages) {
                if (!get().pesan[terbuka]?.some((x) => x.id === m.id)) {
                  tambahPesan(terbuka, m);
                }
              }
              if (get().panelAktif) {
                void chatHttpRead(terbuka, "admin").catch(() => {});
              }
            }
          } catch {
            // abaikan — siklus berikutnya mencoba lagi
          }
        }
      }
    } catch (err) {
      // 401 = token tidak valid lagi (digantikan login lain / dihapus) —
      // HENTIKAN polling selamanya (dulu: loop 401 tak berujung yang membanjiri
      // server setiap 3,5 dtk), hapus token basi, dan minta masuk kembali.
      if (err instanceof KesalahanHttp && err.status === 401) {
        hentikanLoop();
        tokenSaatIni = "";
        clearToken();
        gagalBeruntun = 0;
        set({ status: "berakhir", terbukaId: null, mengetik: false });
        return;
      }
      gagalBeruntun++;
      if (gagalBeruntun >= 3 && get().status !== "gangguan") set({ status: "gangguan" });
    } finally {
      sedangPoll = false;
    }
  }

  return {
    status: "menyambung",
    daftar: [],
    pesan: {},
    terbukaId: null,
    mengetik: false,
    totalBelum: 0,

    mulai: () => {
      if (pollTimer || siklus) return; // sudah berjalan
      const token = getToken() || "";
      tokenSaatIni = token;
      // Token kosong (belum login) → jangan nyalakan loop yang hanya akan
      // gagal; mulai() dipanggil ulang saat mode admin terdeteksi.
      if (!token) return;
      set({ status: "menyambung", daftar: [], pesan: {}, terbukaId: null, totalBelum: 0, mengetik: false });

      // Loop ringan 500ms yang memanggil pollSekali (ia sendiri menjaga
      // agar tidak tumpang-tindih) — memungkinkan ritme berbeda untuk
      // daftar (3,5 dtk) dan utas terbuka (2 dtk).
      tickUtas = 0;
      void pollSekali();
      siklus = setInterval(() => void pollSekali(), 500);
      pollTimer = setTimeout(() => {
        pollTimer = null;
      }, 0);
    },

    berhenti: () => {
      if (siklus) {
        clearInterval(siklus);
        siklus = null;
      }
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      if (timerMengetik) clearTimeout(timerMengetik);
      sedangPoll = false;
      gagalBeruntun = 0;
      idTerlihat.clear();
      set({
        status: "menyambung",
        daftar: [],
        pesan: {},
        terbukaId: null,
        mengetik: false,
        totalBelum: 0,
        panelAktif: false,
      });
    },

    pilih: (id) => {
      if (get().terbukaId === id && id !== null) return;
      set({ terbukaId: id, mengetik: false });
      tickUtas = 0;
      if (id) {
        if (!get().pesan[id]) {
          // Muat riwayat penuh pertama kali.
          void chatHttpHistory(id)
            .then((r) => {
              if (r.ok) {
                set({ pesan: { ...get().pesan, [id]: r.messages } });
                const maks = r.messages.length
                  ? Math.max(...r.messages.map((p) => Number(p.id)))
                  : 0;
                idTerlihat.set(id, Math.max(idTerlihat.get(id) || 0, maks));
              }
            })
            .catch(() => {});
        }
        void chatHttpRead(id, "admin").catch(() => {});
        const daftar = get().daftar.map((c) => (c.id === id ? { ...c, unreadAdmin: 0 } : c));
        set({ daftar: urutkan(daftar), totalBelum: hitungTotal(daftar) });
      }
    },

    balas: async (teks) => {
      const conversationId = get().terbukaId;
      const bersih = teks.trim();
      if (!conversationId || !bersih) return false;
      const tmp: PesanChat = {
        id: `tmp-${Date.now()}`,
        conversationId,
        sender: "admin",
        text: bersih,
        createdAt: Date.now(),
      };
      tambahPesan(conversationId, tmp);

      // 2 percobaan (gangguan sesaat saat publish/jaringan).
      for (let coba = 0; coba < 2; coba++) {
        try {
          const res = await chatHttpReply(tokenSaatIni, conversationId, bersih, tmp.id);
          gantiTmp(conversationId, tmp.id, res.message);
          idTerlihat.set(conversationId, Math.max(idTerlihat.get(conversationId) || 0, Number(res.message.id)));
          // Daftar ikut diperbarui (pesanTerakhir + urutan).
          const daftar = get().daftar.map((c) =>
            c.id === conversationId
              ? { ...c, pesanTerakhir: res.message, updatedAt: res.message.createdAt }
              : c
          );
          setDaftar(daftar);
          return true;
        } catch {
          if (coba < 1) await new Promise((r) => setTimeout(r, 3000));
        }
      }
      return false; // gelembung sementara tetap tampil — admin bisa kirim ulang
    },

    hapus: async (id) => {
      try {
        await chatHttpDelete(tokenSaatIni, id);
        const daftar = get().daftar.filter((c) => c.id !== id);
        const pesan = { ...get().pesan };
        delete pesan[id];
        idTerlihat.delete(id);
        set({
          daftar: urutkan(daftar),
          pesan,
          totalBelum: hitungTotal(daftar),
          terbukaId: get().terbukaId === id ? null : get().terbukaId,
        });
        return true;
      } catch {
        return false;
      }
    },

    kirimSedangMengetik: (aktif) => {
      const conversationId = get().terbukaId;
      if (!conversationId) return;
      const now = Date.now();
      if (aktif && now - terakhirKirimMengetik < 2000) return; // throttle 2 dtk
      terakhirKirimMengetik = now;
      void chatHttpTyping(conversationId, "admin", aktif).catch(() => {});
      if (timerMengetik) clearTimeout(timerMengetik);
      if (aktif) {
        timerMengetik = setTimeout(() => {
          void chatHttpTyping(conversationId, "admin", false).catch(() => {});
        }, 2500);
      }
    },

    setPanelAktif: (v) => {
      set({ panelAktif: v });
      if (v) {
        const terbuka = get().terbukaId;
        if (terbuka) void chatHttpRead(terbuka, "admin").catch(() => {});
      }
    },
  };
});
