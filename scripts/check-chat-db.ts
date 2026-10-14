import { Database } from "bun:sqlite";
const db = new Database("/home/z/my-project/db/chat.db", { readonly: true });
const convs = db.query("SELECT id, nama, createdAt, updatedAt FROM conversations").all();
const msgs = db.query("SELECT id, conversationId, sender, text, createdAt FROM messages ORDER BY id").all();
console.log(JSON.stringify({ convs, msgs }, null, 1));
