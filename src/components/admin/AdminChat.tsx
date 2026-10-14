"use client";

/**
 * AdminChat — tab "Live Chat" di panel admin.
 * Isi panelnya kini berupa komponen bersama AdminChatPanel (variant="panel"),
 * yang juga dipakai oleh widget live chat di website publik saat dibuka oleh
 * admin yang sedang masuk (variant="widget") — sehingga tampilan & perilaku
 * keduanya selalu konsisten.
 */

import { AdminChatPanel } from "@/components/chat/AdminChatPanel";

export function AdminChat() {
  return <AdminChatPanel variant="panel" />;
}
