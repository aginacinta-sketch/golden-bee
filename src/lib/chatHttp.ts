/**
 * chatHttp — jalur HTTP live chat sebagai PENGANTI socket.io saat aplikasi
 * di-publish (chat-service :3003 tidak ikut diterapkan di lingkungan
 * publikasi; gateway XTransformPort hanya ada di sandbox dev).
 *
 * Semua fungsi memakai endpoint /api/chat/* yang berjalan di dalam aplikasi
 * Next itu sendiri sehingga live chat bekerja di mana pun aplikasi di-deploy.
 * Data menulis/membaca tabel ChatMessage yang sama dengan chat-service.
 */

import { adminFetch, adminJson, jsonInit } from "@/lib/client";

export type ChatMsg = {
  id: string;
  conversationId: string;
  sender: "visitor" | "admin";
  name: string;
  message: string;
  readAt: number | null;
  createdAt: number;
};

export type Percakapan = {
  id: string;
  name: string;
  lastMessage: string;
  lastAt: number;
  unread: number;
};

// ---------------------------------------------------------------------------
// Sisi pengunjung
// ---------------------------------------------------------------------------

/** Gabung percakapan: validasi identitas + ambil seluruh riwayat. */
export async function initPengunjung(
  visitorId: string,
  name: string
): Promise<{ ok: boolean; messages: ChatMsg[] }> {
  const res = await fetch("/api/chat/init", jsonInit("POST", { visitorId, name }));
  if (!res.ok) throw new Error("Gagal memulai percakapan");
  return res.json() as Promise<{ ok: boolean; messages: ChatMsg[] }>;
}

/** Kirim pesan pengunjung; baris resmi (ID dari server) dikembalikan. */
export async function kirimPesanPengunjung(
  visitorId: string,
  name: string,
  message: string
): Promise<ChatMsg> {
  const res = await fetch("/api/chat/send", jsonInit("POST", { visitorId, name, message }));
  if (!res.ok) throw new Error("Gagal mengirim pesan");
  const j = (await res.json()) as { ok: boolean; row: ChatMsg };
  return j.row;
}

/** Poll pesan baru sejak waktu `since` + status mengetik admin + total. */
export async function pollPengunjung(
  visitorId: string,
  since: number
): Promise<{ ok: boolean; messages: ChatMsg[]; total: number; adminTyping: boolean }> {
  const res = await fetch(
    `/api/chat/poll?visitorId=${encodeURIComponent(visitorId)}&since=${since}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Polling gagal");
  return res.json() as Promise<{ ok: boolean; messages: ChatMsg[]; total: number; adminTyping: boolean }>;
}

/** Kirim status mengetik pengunjung (fire-and-forget, tak perlu menunggu). */
export function kirimMengetikPengunjung(visitorId: string, typing: boolean): void {
  fetch("/api/chat/typing", jsonInit("POST", { visitorId, typing })).catch(() => {});
}

// ---------------------------------------------------------------------------
// Sisi admin (ber-token via adminFetch/adminJson)
// ---------------------------------------------------------------------------

/**
 * Daftar percakapan + status mengetik pengunjung.
 * Mengembalikan null bila sesi admin tidak berlaku (401) — dipetakan ke
 * tampilan "Sesi tidak berlaku" pada panel.
 */
export async function daftarPercakapanAdmin(): Promise<{
  conversations: Percakapan[];
  typingVisitor: string[];
} | null> {
  const res = await adminFetch("/api/chat/conversations", { cache: "no-store" });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error("Gagal memuat percakapan");
  return res.json() as Promise<{ conversations: Percakapan[]; typingVisitor: string[] }>;
}

/** Seluruh riwayat satu percakapan + total (deteksi percakapan dihapus). */
export async function riwayatAdmin(
  conversationId: string
): Promise<{ messages: ChatMsg[]; total: number }> {
  const j = await adminJson<{ ok: boolean; messages: ChatMsg[]; total: number }>(
    `/api/chat/history?conversationId=${encodeURIComponent(conversationId)}`
  );
  return { messages: j.messages, total: j.total };
}

/** Tandai percakapan sudah dibaca (fire-and-forget). */
export function tandaiDibacaAdmin(conversationId: string): void {
  adminFetch("/api/chat/open", jsonInit("POST", { conversationId })).catch(() => {});
}

/** Kirim balasan admin; baris resmi dikembalikan. */
export async function balasAdmin(conversationId: string, message: string): Promise<ChatMsg> {
  const j = await adminJson<{ ok: boolean; row: ChatMsg }>(
    "/api/chat/reply",
    jsonInit("POST", { conversationId, message })
  );
  return j.row;
}

/** Status mengetik admin (fire-and-forget). */
export function kirimMengetikAdmin(conversationId: string, typing: boolean): void {
  adminFetch("/api/chat/typing-admin", jsonInit("POST", { conversationId, typing })).catch(() => {});
}

/** Hapus SATU percakapan (dengan id) atau SEMUA (tanpa id). */
export async function hapusAdmin(conversationId?: string): Promise<void> {
  await adminJson<{ ok: boolean }>("/api/chat/delete", jsonInit("POST", { conversationId }));
}

/** Hapus SEMUA percakapan. */
export async function hapusSemuaAdmin(): Promise<void> {
  await adminJson<{ ok: boolean }>("/api/chat/delete", jsonInit("POST", { all: true }));
}
