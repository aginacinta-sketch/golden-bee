/**
 * chatServer — helper sisi server untuk jalur HTTP live chat (/api/chat/*).
 * Menulis/membaca tabel ChatMessage yang SAMA dengan chat-service
 * (mini-service socket.io) sehingga kedua jalur berbagi satu sumber data.
 *
 * Kolom waktu memakai ms epoch (BigInt di Prisma karena Int 32-bit meluap)
 * — semua nilai dikonversi ke Number saat keluar agar aman di-JSON-kan.
 */

import { db } from "@/lib/db";
import type { ChatMsg, Percakapan } from "@/lib/chatHttp";

type BarisChat = {
  id: string;
  conversationId: string;
  sender: string;
  name: string;
  message: string;
  readAt: bigint | null;
  createdAt: bigint;
};

/** Konversi baris DB (BigInt) → bentuk aman JSON. */
function kePesan(row: BarisChat): ChatMsg {
  return {
    id: row.id,
    conversationId: row.conversationId,
    sender: row.sender === "admin" ? "admin" : "visitor",
    name: row.name,
    message: row.message,
    readAt: row.readAt === null || row.readAt === undefined ? null : Number(row.readAt),
    createdAt: Number(row.createdAt),
  };
}

/** Bersihkan nama pengunjung (maks 60 karakter). */
export function validasiNama(nama: unknown): string {
  return String(nama ?? "").trim().slice(0, 60);
}

/** Bersihkan isi pesan (maks 2000 karakter). */
export function validasiPesan(pesan: unknown): string {
  return String(pesan ?? "").trim().slice(0, 2000);
}

/** ID percakapan = visitorId; wajib terlihat seperti UUID agar rapi. */
export function validasiVisitorId(visitorId: unknown): string {
  return String(visitorId ?? "").trim().slice(0, 64);
}

/** Simpan pesan baru; baris resmi (ID dari server) dikembalikan. */
export async function sisipPesan(data: {
  conversationId: string;
  sender: "visitor" | "admin";
  name: string;
  message: string;
}): Promise<ChatMsg> {
  const row = await db.chatMessage.create({
    data: {
      conversationId: data.conversationId,
      sender: data.sender,
      name: data.name,
      message: data.message,
      createdAt: BigInt(Date.now()),
    },
  });
  return kePesan(row as BarisChat);
}

/** Seluruh riwayat satu percakapan (urut waktu naik). */
export async function ambilRiwayat(conversationId: string): Promise<ChatMsg[]> {
  const rows = await db.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => kePesan(r as BarisChat));
}

/** Pesan baru sejak waktu `since` (ms epoch, eksklusif), urut waktu naik. */
export async function pesanSejak(conversationId: string, since: number): Promise<ChatMsg[]> {
  const rows = await db.chatMessage.findMany({
    where: { conversationId, createdAt: { gt: BigInt(Math.floor(since)) } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => kePesan(r as BarisChat));
}

/** Total pesan percakapan — untuk deteksi "percakapan dihapus" (total 0). */
export async function hitungPesan(conversationId: string): Promise<number> {
  return db.chatMessage.count({ where: { conversationId } });
}

/** Tandai seluruh pesan pengunjung pada percakapan sudah dibaca admin. */
export async function tandaiTerbaca(conversationId: string): Promise<void> {
  await db.chatMessage.updateMany({
    where: { conversationId, sender: "visitor", readAt: null },
    data: { readAt: BigInt(Date.now()) },
  });
}

/**
 * Daftar percakapan untuk panel admin (SQL sama dengan chat-service):
 * nama = nama terakhir pada percakapan, pesan & waktu terakhir, dan jumlah
 * belum dibaca (pesan pengunjung tanpa readAt).
 */
export async function daftarPercakapan(): Promise<Percakapan[]> {
  const rows = await db.$queryRaw<
    {
      id: string;
      name: string | null;
      lastMessage: string | null;
      lastAt: bigint | null;
      unread: bigint | number | null;
    }[]
  >`
    SELECT m.conversationId AS id,
      COALESCE(
        (SELECT value FROM Setting WHERE key = 'chat_name_' || m.conversationId LIMIT 1),
        (SELECT name FROM ChatMessage WHERE conversationId = m.conversationId AND sender = 'visitor' AND name != 'Pengunjung' ORDER BY createdAt DESC LIMIT 1),
        (SELECT name FROM ChatMessage WHERE conversationId = m.conversationId AND sender = 'visitor' ORDER BY createdAt DESC LIMIT 1),
        'Pengunjung'
      ) AS name,
      (SELECT message FROM ChatMessage WHERE conversationId = m.conversationId ORDER BY createdAt DESC LIMIT 1) AS "lastMessage",
      MAX(m.createdAt) AS "lastAt",
      SUM(CASE WHEN m.sender = 'visitor' AND m.readAt IS NULL THEN 1 ELSE 0 END) AS unread
    FROM ChatMessage m
    GROUP BY m.conversationId
    ORDER BY lastAt DESC
  `;
  return rows.map((r) => {
    const lastAt = r.lastAt === null || r.lastAt === undefined ? 0 : Number(r.lastAt);
    const unread = Number(r.unread ?? 0);
    const name = r.name || "Pengunjung";
    const lastMessage = r.lastMessage || "";
    return {
      id: r.id,
      name,
      nama: name,
      lastMessage,
      pesanTerakhir: lastMessage
        ? {
            id: String(lastAt),
            conversationId: r.id,
            sender: "pengunjung",
            text: lastMessage,
            createdAt: lastAt,
          }
        : null,
      lastAt,
      updatedAt: lastAt,
      createdAt: lastAt,
      unread,
      unreadAdmin: unread,
    } as unknown as Percakapan;
  });
}

/** Hapus SATU percakapan (dengan id) atau SEMUA (tanpa id). */
export async function hapusPercakapan(conversationId?: string): Promise<void> {
  if (conversationId) {
    await db.chatMessage.deleteMany({ where: { conversationId } });
  } else {
    await db.chatMessage.deleteMany({});
  }
}
