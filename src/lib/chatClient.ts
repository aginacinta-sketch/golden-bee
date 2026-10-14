// Klien Live Chat (Task 52 — dibuat ulang).
//
// ARSITEKTUR BARU: livechat hidup DI DALAM Next.js sebagai API route
// (/api/chat/*) + polling adaptif. Tidak lagi ada mini-service terpisah di
// port 3003 yang berulang kali dibunuh OOM-killer saat proses publish.
//
// Konsekuensinya:
// - Semua panggilan SAME-ORIGIN `/api/chat/...` — tanpa XTransformPort,
//   tanpa gateway, tanpa socket.io. Bila halaman situs bisa dimuat,
//   endpoint chat dijamin juga bisa dijangkau (proses yang sama).
// - Realtime = polling inkremental (`since` = id pesan terakhir) tiap 2 dtk
//   saat panel terbuka; badge notifikasi tiap 6 dtk saat tertutup.

export type SisiChat = "pengunjung" | "admin";

export type PesanChat = {
  id: number | string;
  conversationId: string;
  sender: SisiChat;
  text: string;
  createdAt: number;
  clientTmpId?: string;
};

export type PercakapanChat = {
  id: string;
  nama: string;
  createdAt: number;
  updatedAt: number;
  pesanTerakhir: PesanChat | null;
  unreadAdmin: number;
};

export type RiwayatChat = {
  ok: boolean;
  nama: string;
  messages: PesanChat[];
  adminMengetik: boolean;
  pengunjungMengetik: boolean;
  dibacaOlehAdmin: boolean;
  lastId: number;
};

/** Error dengan status HTTP — dipakai pemanggil untuk membedakan 401
 *  (sesi berakhir) dari gangguan jaringan/server biasa. */
export class KesalahanHttp extends Error {
  status: number;
  constructor(status: number, pesan: string) {
    super(pesan);
    this.name = "KesalahanHttp";
    this.status = status;
  }
}

async function panggil<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.token) headers.set("x-admin-token", init.token);
  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new KesalahanHttp(res.status, data?.error || "Gagal menghubungi layanan chat.");
  return data;
}

function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  return panggil<T>(path, { method: "POST", body: JSON.stringify(body), token });
}

// ---------- Pengunjung ----------

export function chatHttpInit(nama: string): Promise<{ conversationId: string }> {
  return post<{ conversationId: string }>("/api/chat/init", { nama });
}

export function chatHttpHistory(
  conversationId: string,
  since = 0
): Promise<RiwayatChat> {
  return panggil<RiwayatChat>(
    `/api/chat/history?id=${encodeURIComponent(conversationId)}&since=${since}`
  );
}

export function chatHttpSend(
  conversationId: string,
  text: string,
  clientTmpId?: string
): Promise<{ message: PesanChat; duplikat?: boolean }> {
  return post<{ message: PesanChat; duplikat?: boolean }>("/api/chat/send", {
    conversationId,
    text,
    clientTmpId,
  });
}

export function chatHttpRead(conversationId: string, side: SisiChat): Promise<unknown> {
  return post("/api/chat/read", { conversationId, side });
}

export function chatHttpTyping(
  conversationId: string,
  side: SisiChat,
  aktif: boolean
): Promise<unknown> {
  return post("/api/chat/typing", { conversationId, side, aktif });
}

export function chatHttpUnread(conversationId: string): Promise<{ count: number }> {
  return panggil<{ count: number }>(
    `/api/chat/unread?id=${encodeURIComponent(conversationId)}`
  );
}

// ---------- Admin ----------

export function chatHttpConversations(
  token: string
): Promise<{ conversations: PercakapanChat[] }> {
  return panggil<{ conversations: PercakapanChat[] }>("/api/chat/conversations", { token });
}

export function chatHttpReply(
  token: string,
  conversationId: string,
  text: string,
  clientTmpId?: string
): Promise<{ message: PesanChat; duplikat?: boolean }> {
  return post<{ message: PesanChat; duplikat?: boolean }>(
    "/api/chat/reply",
    { conversationId, text, clientTmpId },
    token
  );
}

export function chatHttpDelete(token: string, conversationId: string): Promise<unknown> {
  return post("/api/chat/delete", { conversationId }, token);
}
