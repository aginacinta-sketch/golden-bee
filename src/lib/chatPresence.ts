/**
 * chatPresence — status "sedang mengetik" untuk jalur HTTP live chat.
 *
 * HTTP tidak punya koneksi persist seperti socket.io, sehingga status
 * mengetik disimpan sementara DI MEMORI proses Next (singleton globalThis)
 * dengan TTL pendek: klien mengirim heartbeat mengetik berkala dan status
 * otomatis dianggap berakhir bila tidak diperbarui.
 *
 * Dipakai oleh route /api/chat/typing, /api/chat/typing-admin (penulis)
 * dan /api/chat/poll, /api/chat/conversations (pembaca).
 */

const TTL_MS = 4000;

type Entri = { waktu: number };

type SimpananPresence = {
  /** visitorId → detak terakhir "pengunjung sedang mengetik". */
  pengunjung: Map<string, Entri>;
  /** conversationId → detak terakhir "admin sedang mengetik". */
  admin: Map<string, Entri>;
};

// Singleton antar hot-reload dev — simpan di globalThis.
const g = globalThis as unknown as { __chatPresence?: SimpananPresence };
const simpanan: SimpananPresence = g.__chatPresence ?? { pengunjung: new Map(), admin: new Map() };
g.__chatPresence = simpanan;

function segar(entri: Entri | undefined): boolean {
  return !!entri && Date.now() - entri.waktu < TTL_MS;
}

/** Catat/hentikan status mengetik pengunjung (visitorId = conversationId). */
export function aturMengetikPengunjung(visitorId: string, mengetik: boolean) {
  if (mengetik) simpanan.pengunjung.set(visitorId, { waktu: Date.now() });
  else simpanan.pengunjung.delete(visitorId);
}

/** Catat/hentikan status mengetik admin pada percakapan tertentu. */
export function aturMengetikAdmin(conversationId: string, mengetik: boolean) {
  if (mengetik) simpanan.admin.set(conversationId, { waktu: Date.now() });
  else simpanan.admin.delete(conversationId);
}

/** Apakah pengunjung (percakapan) ini sedang mengetik? */
export function pengunjungMengetik(conversationId: string): boolean {
  return segar(simpanan.pengunjung.get(conversationId));
}

/** Daftar visitorId yang sedang mengetik (untuk daftar percakapan admin). */
export function daftarPengunjungMengetik(): string[] {
  const hasil: string[] = [];
  for (const [id, entri] of simpanan.pengunjung) {
    if (segar(entri)) hasil.push(id);
    else simpanan.pengunjung.delete(id); // sekalian bersihkan kadaluarsa
  }
  return hasil;
}

/** Apakah admin sedang mengetik pada percakapan ini? (dibaca poll pengunjung) */
export function adminSedangMengetik(conversationId: string): boolean {
  return segar(simpanan.admin.get(conversationId));
}
