# 🐝 Golden Bee Indonesia — Katalog Supplier B2B

Website katalog supplier B2B Indonesia: daftar produk lengkap dengan foto, harga grosir, WhatsApp langsung, chat realtime, dan panel admin untuk mengelola semuanya.

**Teknologi:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 + shadcn/ui · SQLite (bun:sqlite) · Prisma · socket.io

---

## ⬆️ Mau upload repo ini ke GitHub?

**Baca dulu: [`MULAI-DISINI-GITHUB.md`](MULAI-DISINI-GITHUB.md)** — panduan 3 cara upload (skrip otomatis / terminal / web) beserta batasan yang perlu diketahui.

Ringkasan tercepat (butuh repo kosong di GitHub + Personal Access Token):

```bash
bash scripts/sambungkan-github.sh https://github.com/USERNAME/NAMA-REPO.git ghp_TOKEN_ANDA
```

Aktifkan sinkron otomatis (dorong perubahan tiap 10 menit):

```bash
bash scripts/sambungkan-github.sh --auto
```

---

## 🚀 Menjalankan proyek

```bash
bun install          # pasang dependensi
bun run db:push      # siapkan skema database (SQLite sudah termasuk di db/custom.db)
bun run dev          # jalankan di http://localhost:3000
```

Layanan chat realtime (socket.io) berjalan sebagai mini service terpisah:

```bash
cd mini-services/chat-service && bun install && bun run dev   # port 3003
```

## 🔑 Masuk panel admin

Buka `/admin` — kata sandi bawaan `admin123` (**segera ganti** setelah situs online).

## 📦 Isi penting repo

| Lokasi | Keterangan |
|---|---|
| `src/` | Kode website lengkap (halaman, API, komponen) |
| `db/custom.db` | Database SQLite — produk, pengaturan, pesan chat (**cadangan data, sengaja di-track**) |
| `scripts/sambungkan-github.sh` | Skrip sambung + dorong ke GitHub (token disimpan lokal, tidak ikut repo) |
| `scripts/auto-push-github.sh` | Loop sinkron otomatis ke GitHub |
| `deploy/` | Konfigurasi systemd + Docker untuk VPS |
| `PANDUAN-HOSTING.md` | Panduan lengkap hosting/sendiri (VPS, Docker, migrasi, sinkron GitHub) |

## 📄 Panduan lanjutan

- **Hosting sendiri / VPS:** [`PANDUAN-HOSTING.md`](PANDUAN-HOSTING.md)
- **Sinkronisasi otomatis ke GitHub:** [`PANDUAN-HOSTING.md` § 7b](PANDUAN-HOSTING.md)
