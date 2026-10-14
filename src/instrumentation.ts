// Instrumentasi Next.js — `register()` berjalan SEKALI saat server boot
// (dev server maupun server produksi standalone hasil publish).
//
// Tujuan: menyalakan penjaga server (scripts/dev-watchdog.sh) dari dalam
// proses server supaya terikat pada pohon proses platform (bukan shell
// sesi) sehingga tetap hidup. Watchdog menjaga:
//   - :3000 (website — dev ATAU standalone hasil publish, tidak dibedakan)
//   - :3003 (chat-service socket.io)
// sehingga jika proses publish (next build) mematikan server, semuanya
// bangkit kembali otomatis dalam ±1 menit.
//
// Catatan: modul bawaan Node diambil lewat process.getBuiltinModule()
// (Node ≥ 20.16) supaya bundler Edge TIDAK mencoba memaketkan
// child_process/fs (menghindari peringatan "Ecmascript file had an error").
export async function register() {
  // Hanya di runtime Node.js (bukan Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // ============================================================
  // SINKRONISASI PENGATURAN (penyembuh "link QR kustom hilang setelah
  // beberapa jam"): saat salinan website ter-deploy bangkit ulang setelah
  // didaur ulang platform, database kembali ke isi paket terakhir. Di sini
  // server produksi menarik setelan terbaru dari pusat data (URL preview)
  // sehingga link QR kustom & pengaturan lain otomatis dipulihkan.
  // Diletakkan SEBELUM bagian watchdog karena folder scripts/ tidak ikut
  // dalam paket deploy — jangan biarkan return awal melewatkan sync.
  // Di sandbox (NODE_ENV=development) fungsi ini no-op — sandbox = pusat.
  // ============================================================
  try {
    const { bootSync } = await import("@/lib/settings-sync");
    await bootSync();
  } catch {
    // sinkronisasi gagal dimuat — website tetap berjalan normal
  }

  type BuiltinGetter = (name: string) => unknown | undefined;
  const ambil = (process as unknown as { getBuiltinModule?: BuiltinGetter }).getBuiltinModule;
  if (!ambil) return;
  const cp = ambil.call(process, "child_process") as
    | {
        spawn: (cmd: string, args: string[], opts: Record<string, unknown>) => { unref: () => void };
        exec: (cmd: string, cb: (err: unknown, stdout: string) => void) => void;
      }
    | undefined;
  const fsMod = ambil.call(process, "fs") as { existsSync: (p: string) => boolean } | undefined;
  if (!cp?.spawn || !fsMod?.existsSync) return;

  const script = "/home/z/my-project/scripts/dev-watchdog.sh";
  if (!fsMod.existsSync(script)) return;

  // Cegah dobel: pakai pola [g] agar pgrep tidak mencocokkan dirinya sendiri.
  cp.exec("pgrep -f 'dev-watchdo[g].sh' || true", (err: unknown, stdout: string) => {
    if (err || (stdout && stdout.trim())) return; // sudah ada watchdog
    try {
      const anak = cp.spawn("bash", [script], {
        detached: true,
        stdio: "ignore",
        cwd: "/home/z/my-project",
      });
      anak.unref();
    } catch {
      // gagal spawn — dicoba lagi saat server berikutnya boot
    }
  });
}
