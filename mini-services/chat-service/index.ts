/**
 * Chat service (live chat) — mini-service socket.io di port 3003.
 *
 * Menyediakan realtime untuk live chat pengunjung ⇄ admin:
 *  - Pengunjung: chat:init, chat:send, chat:typing  (ruang "v:<visitorId>")
 *  - Admin:      admin:auth, chat:list, chat:history, chat:open,
 *                chat:reply, chat:typing-admin,
 *                chat:delete-conversation, chat:delete-all (ruang "admins")
 *
 * Memakai file database yang SAMA dengan aplikasi Next (db/custom.db, tabel
 * ChatMessage) sehingga jalur HTTP /api/chat/* (dipakai saat aplikasi di-
 * publish tanpa service ini) dan jalur socket berbagi satu sumber data.
 */

import { Database } from "bun:sqlite";
import { join } from "node:path";
import { Server } from "socket.io";

const PORT = 3003;
const DB_PATH = join(import.meta.dir, "..", "..", "db", "custom.db");

const db = new Database(DB_PATH);
// WAL + busy timeout: aman untuk akses multi-proses bersama aplikasi Next.
db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");

const insertMessage = db.prepare(
  `INSERT INTO ChatMessage (id, conversationId, sender, name, message, readAt, createdAt)
   VALUES (?, ?, ?, ?, ?, NULL, ?)`
);
const selectHistory = db.prepare(
  `SELECT id, conversationId, sender, name, message, readAt, createdAt
   FROM ChatMessage WHERE conversationId = ? ORDER BY createdAt ASC`
);
const markConversationRead = db.prepare(
  `UPDATE ChatMessage SET readAt = ? WHERE conversationId = ? AND sender = 'visitor' AND readAt IS NULL`
);
const deleteConversation = db.prepare(`DELETE FROM ChatMessage WHERE conversationId = ?`);
const deleteAllMessages = db.prepare(`DELETE FROM ChatMessage`);
const selectConversationIds = db.prepare(`SELECT DISTINCT conversationId FROM ChatMessage`);
const selectConversations = db.prepare(`
  SELECT m.conversationId AS id,
    (SELECT name FROM ChatMessage WHERE conversationId = m.conversationId AND sender = 'visitor' ORDER BY createdAt DESC LIMIT 1) AS name,
    (SELECT message FROM ChatMessage WHERE conversationId = m.conversationId ORDER BY createdAt DESC LIMIT 1) AS "lastMessage",
    MAX(m.createdAt) AS "lastAt",
    SUM(CASE WHEN m.sender = 'visitor' AND m.readAt IS NULL THEN 1 ELSE 0 END) AS unread
  FROM ChatMessage m
  GROUP BY m.conversationId
  ORDER BY lastAt DESC
`);
const getSetting = db.prepare(`SELECT value FROM Setting WHERE key = ? LIMIT 1`);

function getAdminToken(): string | null {
  return getSetting.get("adminToken")?.value ?? null;
}

function namaPemasok(): string {
  return String(getSetting.get("supplierName")?.value ?? "Admin").trim().slice(0, 60) || "Admin";
}

type Baris = {
  id: string;
  conversationId: string;
  sender: string;
  name: string;
  message: string;
  readAt: number | null;
  createdAt: number;
};

function pesan(row: Baris) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    sender: row.sender === "admin" ? ("admin" as const) : ("visitor" as const),
    name: row.name,
    message: row.message,
    readAt: row.readAt ?? null,
    createdAt: Number(row.createdAt),
  };
}

function bersihkan(nilai: unknown, maks: number): string {
  return String(nilai ?? "").trim().slice(0, maks);
}

function listConversations() {
  return (selectConversations.all() as unknown as { id: string; name: string | null; lastMessage: string | null; lastAt: number | bigint | null; unread: number | null }[]).map(
    (r) => ({
      id: r.id,
      name: r.name || "Pengunjung",
      lastMessage: r.lastMessage || "",
      lastAt: Number(r.lastAt ?? 0),
      unread: Number(r.unread ?? 0),
    })
  );
}

function broadcastConversationList() {
  io.to("admins").emit("chat:conversations", { conversations: listConversations() });
}

const io = new Server({
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  socket.on("chat:init", (data: { visitorId?: string; name?: string }, cb?: (r: unknown) => void) => {
    const visitorId = bersihkan(data?.visitorId, 64);
    const name = bersihkan(data?.name, 60);
    if (!visitorId || !name) {
      cb?.({ ok: false });
      return;
    }
    socket.join(`v:${visitorId}`);
    const rows = selectHistory.all(visitorId) as unknown as Baris[];
    cb?.({ ok: true, messages: rows.map(pesan) });
  });

  socket.on("chat:send", (data: { visitorId?: string; name?: string; message?: string }) => {
    const visitorId = bersihkan(data?.visitorId, 64);
    const name = bersihkan(data?.name, 60);
    const message = bersihkan(data?.message, 2000);
    if (!visitorId || !name || !message) return;
    const info = insertMessage.run(crypto.randomUUID(), visitorId, "visitor", name, message, Date.now());
    const row = (selectHistory.all(visitorId) as unknown as Baris[]).find((r) => r.id === info.lastInsertRowid) ??
      ({
        id: String(info.lastInsertRowid),
        conversationId: visitorId,
        sender: "visitor",
        name,
        message,
        readAt: null,
        createdAt: Date.now(),
      } as Baris);
    io.to(`v:${visitorId}`).emit("chat:message", pesan(row));
    io.to("admins").emit("chat:message", pesan(row));
    broadcastConversationList();
  });

  socket.on("chat:typing", (data: { visitorId?: string; typing?: boolean }) => {
    const visitorId = bersihkan(data?.visitorId, 64);
    if (!visitorId) return;
    socket.to("admins").emit("chat:typing-visitor", { conversationId: visitorId, typing: !!data?.typing });
  });

  socket.on("admin:auth", (data: { token?: string }, cb?: (r: unknown) => void) => {
    const token = bersihkan(data?.token, 200);
    const sah = !!token && token === getAdminToken();
    if (!sah) {
      cb?.({ ok: false });
      return;
    }
    socket.join("admins");
    cb?.({ ok: true, conversations: listConversations() });
  });

  // ---- Event khusus admin: wajib sudah lulus admin:auth (ruang "admins") ----
  const adalahAdmin = () => socket.rooms.has("admins");

  socket.on("chat:list", (_data: unknown, cb?: (r: unknown) => void) => {
    if (!adalahAdmin()) {
      cb?.({ ok: false });
      return;
    }
    cb?.({ ok: true, conversations: listConversations() });
  });

  socket.on("chat:history", (data: { conversationId?: string }, cb?: (r: unknown) => void) => {
    if (!adalahAdmin()) {
      cb?.({ ok: false });
      return;
    }
    const conversationId = bersihkan(data?.conversationId, 64);
    if (!conversationId) {
      cb?.({ ok: false });
      return;
    }
    const rows = selectHistory.all(conversationId) as unknown as Baris[];
    cb?.({ ok: true, messages: rows.map(pesan) });
  });

  socket.on("chat:open", (data: { conversationId?: string }) => {
    if (!adalahAdmin()) return;
    const conversationId = bersihkan(data?.conversationId, 64);
    if (!conversationId) return;
    const berubah = markConversationRead.run(Date.now(), conversationId).changes;
    if (berubah > 0) broadcastConversationList();
  });

  socket.on("chat:reply", (data: { conversationId?: string; message?: string }) => {
    if (!adalahAdmin()) return;
    const conversationId = bersihkan(data?.conversationId, 64);
    const message = bersihkan(data?.message, 2000);
    if (!conversationId || !message) return;
    const name = namaPemasok();
    const info = insertMessage.run(crypto.randomUUID(), conversationId, "admin", name, message, Date.now());
    const row = (selectHistory.all(conversationId) as unknown as Baris[]).find((r) => r.id === info.lastInsertRowid) ??
      ({
        id: String(info.lastInsertRowid),
        conversationId,
        sender: "admin",
        name,
        message,
        readAt: null,
        createdAt: Date.now(),
      } as Baris);
    io.to(`v:${conversationId}`).emit("chat:message", pesan(row));
    io.to("admins").emit("chat:message", pesan(row));
    broadcastConversationList();
  });

  socket.on("chat:typing-admin", (data: { conversationId?: string; typing?: boolean }) => {
    if (!adalahAdmin()) return;
    const conversationId = bersihkan(data?.conversationId, 64);
    if (!conversationId) return;
    io.to(`v:${conversationId}`).emit("chat:typing-admin", { typing: !!data?.typing });
  });

  socket.on("chat:delete-conversation", (data: { conversationId?: string }, cb?: (r: unknown) => void) => {
    if (!adalahAdmin()) {
      cb?.({ ok: false });
      return;
    }
    const conversationId = bersihkan(data?.conversationId, 64);
    if (!conversationId) {
      cb?.({ ok: false });
      return;
    }
    deleteConversation.run(conversationId);
    io.to(`v:${conversationId}`).emit("chat:cleared", { conversationId });
    io.to("admins").emit("chat:conversation-deleted", { conversationId });
    broadcastConversationList();
    cb?.({ ok: true });
  });

  socket.on("chat:delete-all", (_data: unknown, cb?: (r: unknown) => void) => {
    if (!adalahAdmin()) {
      cb?.({ ok: false });
      return;
    }
    const ids = (selectConversationIds.all() as unknown as { conversationId: string }[]).map(
      (r) => r.conversationId
    );
    deleteAllMessages.run();
    for (const id of ids) io.to(`v:${id}`).emit("chat:cleared", { conversationId: id });
    io.to("admins").emit("chat:conversation-deleted", { all: true });
    broadcastConversationList();
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    // tidak ada pembersihan khusus — ruang dikelola socket.io
  });

  socket.on("error", (error) => {
    console.error("socket error:", error);
  });
});

io.listen(PORT);
console.log(`Chat service (live chat) berjalan di port ${PORT}`);
