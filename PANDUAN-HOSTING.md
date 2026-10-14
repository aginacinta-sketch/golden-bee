# 🚀 PANDUAN HOSTING — Website Katalog Supplier B2B

> Berlaku untuk proyek **MitraDagang / GOLDEN BEE INDONESIA**
> (Next.js 16 · SQLite · live chat · panel admin).

---

## Daftar isi

1. [Pilih cara hosting Anda](#1-pilih-cara-hosting-anda)
2. [Yang perlu Anda tahu dulu (arsitektur singkat)](#2-yang-perlu-anda-tahu-dulu-arsitektur-singkat)
3. [Opsi A — Publish di platform (paling mudah)](#3-opsi-a--publish-di-platform-paling-mudah)
4. [Opsi B — VPS sendiri + domain sendiri (direkomendasikan)](#4-opsi-b--vps-sendiri--domain-sendiri-direkomendasikan)
5. [Opsi C — Docker (paling praktis di VPS)](#5-opsi-c--docker-paling-praktis-di-vps)
6. [Opsi D — PaaS (Railway / Render / Fly.io)](#6-opsi-d--paas-railway--render--flyio)
7. [Migrasi database (pindahkan semua data Anda)](#7-migrasi-database-pindahkan-semua-data-anda)
7b. [Sinkronisasi otomatis ke GitHub](#7b-sinkronisasi-otomatis-ke-github-cadangan-kode--data)
8. [Update versi aplikasi](#8-update-versi-aplikasi)
9. [Backup berkala](#9-backup-berkala)
10. [Checklist keamanan produksi](#10-checklist-keamanan-produksi)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Pilih cara hosting Anda

| Opsi | Kemudahan | Domain sendiri | Biaya | Cocok untuk |
|---|---|---|---|---|
| **A. Publish di platform** | ⭐⭐⭐⭐⭐ (1 klik) | ❌ pakai domain platform | termasuk platform | publikasi cepat, uji coba |
| **B. VPS sendiri (Bun + systemd + Caddy)** | ⭐⭐⭐ | ✅ penuh + HTTPS gratis | ± Rp50–150rb/bln | produksi serius, kontrol penuh |
| **C. Docker di VPS** | ⭐⭐⭐⭐ | ✅ penuh (Caddy di depan) | sama seperti B | produksi dengan setup ringkas |
| **D. PaaS (Railway/Render/Fly)** | ⭐⭐⭐⭐ | ✅ | mulai ± $5/bln | tanpa kelola server |

> **Semua opsi memakai kode yang sama — tidak perlu mengubah apa pun.**
> Konfigurasi kini dibaca dari variabel environment (`DATABASE_URL`),
> sehingga proyek siap di-host di mana pun.

---

## 2. Yang perlu Anda tahu dulu (arsitektur singkat)

Aplikasi ini terdiri dari **dua bagian**:

| Bagian | Port | Wajib? | Fungsi |
|---|---|---|---|
| **Aplikasi utama** (Next.js standalone) | 3000 | ✅ wajib | website katalog + panel admin + semua API |
| **Chat service** (socket.io) | 3003 | ⭕ opsional | pesan live chat **realtime** |

**Fakta penting yang memudahkan hosting:**

- **Seluruh data ada dalam SATU file SQLite**: `db/custom.db`
  (produk, pengaturan admin, **gambar/video tersimpan base64 di dalam DB**,
  pesan chat, kontak masuk). Menyalin file itu = memindahkan seluruh website.
- **Live chat punya dua jalur**: tanpa chat service, live chat **tetap
  berfungsi** lewat jalur HTTP (`/api/chat/*`) — hanya tanpa update
  seketika. Chat service :3003 hanya menambahkan kemampuan realtime.
- **Database dikonfigurasi lewat environment** `DATABASE_URL`
  (contoh: `file:/opt/b2b-katalog/db/custom.db`). Path absolut paling aman.
- **Spesifikasi server minimal**: 1 vCPU, **2 GB RAM** (build `next build`
  butuh memori; lihat tips Opsi B bila RAM kecil), 10 GB disk.

---

## 3. Opsi A — Publish di platform (paling mudah)

1. Klik tombol **Publish** di panel platform → website langsung tayang
   di URL publikasi platform.
2. Selesai. Semua pengaturan Admin Panel tersimpan di database dan tampil
   di website (sudah diverifikasi end-to-end).

> ⚠️ **PENTING ( Oktober 2025 )**: perbaikan untuk masalah *"loading lama
> tanpa menampilkan apa pun setelah deployment"* (Task 68) baru ada di
> kode sandbox. **Publish ULANG satu kali** agar perbaikan ikut terbangun
> ke URL publikasi.

**Batasan**: URL memakai domain platform (`*.space-z.ai`), tidak bisa
diganti dengan domain sendiri. Untuk domain sendiri → Opsi B / C / D.

---

## 4. Opsi B — VPS sendiri + domain sendiri (direkomendasikan)

Contoh acuan: **Ubuntu 22.04/24.04**, domain `katalog.contoh-domain.com`,
proyek di `/opt/b2b-katalog`, user `deploy`.

### B1 — Prasyarat

- VPS (1 vCPU / 2 GB RAM / Ubuntu 22.04+)
- Domain Anda → buat **DNS record A** mengarah ke IP VPS:
  ```
  Tipe: A    Nama: katalog    Nilai: <IP_VPS>    TTL: 3600
  ```
- Buka port di firewall:
  ```bash
  sudo ufw allow 22,80,443/tcp && sudo ufw enable
  ```
- **(Disarankan) Uji dulu kompatibilitas VPS** — skrip bawaan proyek, hanya
  membaca kondisi server tanpa mengubah apa pun:
  ```bash
  bash deploy/cek-vps.sh
  ```
  Hasilnya menjelaskan item mana yang lulus / perlu diperbaiki (RAM, disk,
  port bebas, internet, OpenSSL, dll).

### B2 — Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc && which bun   # catat path, mis. /home/deploy/.bun/bin/bun
```

### B3 — Salin proyek + database ke VPS

**Cara A — Git clone (direkomendasikan; repo bersih sudah disiapkan):**

Repo git memuat SEMUA kode + konfigurasi hosting, TANPA database
(praktik terbaik — data tidak ditaruh di git):

```bash
# (1) Di komputer lokal — sekali saja: unduh repo-git-siap-push.zip
#     dari folder unduhan/download platform, ekstrak, lalu unggah ke
#     akun GitHub/GitLab Anda:
#     buat repo kosong di GitHub (mis. katalog-b2b) TANPA README,
#     lalu:
cd katalog-b2b
git remote add origin https://github.com/<username>/katalog-b2b.git
git push -u origin main

# (2) Di VPS — ambil kodenya:
git clone https://github.com/<username>/katalog-b2b.git /opt/b2b-katalog
```

**Cara B — rsync langsung dari komputer lokal:**

```bash
rsync -av --exclude node_modules --exclude .next --exclude .git \
      ./b2b-katalog/ deploy@<IP_VPS>:/opt/b2b-katalog/
```

**Database — WAJIB di kedua cara** (lihat bagian 7 tentang urutan aman & WAL):

```bash
# ambil db/custom.db dari paket kode (kode-proyek-katalog-b2b.zip)
# atau backup terbaru, lalu:
scp db/custom.db deploy@<IP_VPS>:/opt/b2b-katalog/db/custom.db
```

### B4 — Konfigurasi environment

```bash
cd /opt/b2b-katalog
cp .env.example .env
nano .env    # pastikan: DATABASE_URL=file:/opt/b2b-katalog/db/custom.db
```

### B5 — Build

```bash
cd /opt/b2b-katalog
bun install
bun run db:generate     # generate Prisma client (WAJIB, tidak otomatis)
bun run db:push         # samakan schema (DB asli Anda sudah berisi data → aman)
bun run build           # hasil: .next/standalone (server produksi mandiri)
```

> 💡 **VPS RAM 1 GB?** Build di komputer lokal, lalu unggah hasilnya:
> `rsync -av .next/standalone/ deploy@<IP_VPS>:/opt/b2b-katalog/.next/standalone/`
> (build script sandbox sudah memasukkan static/public/Prisma client ke
> dalam folder standalone tersebut).

### B6 — Jalankan sebagai layanan (systemd)

Unit sudah disediakan di folder `deploy/`:

```bash
sudo nano deploy/b2b-katalog.service   # sesuaikan 4 baris bertanda GANTI
sudo cp deploy/b2b-katalog.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now b2b-katalog
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # harus 200
```

Chat realtime (opsional):

```bash
sudo nano deploy/b2b-chat.service      # sesuaikan baris GANTI
sudo cp deploy/b2b-chat.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now b2b-chat
```

### B7 — Domain + HTTPS otomatis (Caddy)

```bash
sudo apt install -y caddy
sudo nano deploy/Caddyfile.contoh      # ganti katalog.contoh-domain.com
sudo cp deploy/Caddyfile.contoh /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy otomatis menerbitkan sertifikat **Let's Encrypt** (HTTPS aktif dalam
±1 menit setelah DNS mengarah benar). Blok `@transform_port_query` di
Caddyfile contoh juga membuat chat realtime berfungsi persis seperti di sandbox.

### B8 — Verifikasi akhir

- `https://katalog.contoh-domain.com` → katalog tampil, produk ada
- Tombol Admin → login → ubah satu pengaturan → tersimpan & tampil
- Live chat: kirim pesan dari widget → muncul di Admin Panel → Live Chat

---

## 5. Opsi C — Docker (paling praktis di VPS)

`Dockerfile` + `docker-compose.yml` sudah disiapkan (mengikuti alur build
yang sama dengan rantai publish terverifikasi):

```bash
# di VPS dengan Docker terpasang
cd /opt/b2b-katalog
docker compose up -d --build            # aplikasi utama :3000
docker compose --profile chat up -d     # + chat realtime :3003 (opsional)
```

- Database ada di **named volume** `db-data` → aman saat container di-recreate.
- **Memindahkan DB asli Anda ke volume**:
  ```bash
  docker compose stop web
  docker cp custom.db b2b-katalog-web:/app/db/custom.db
  docker compose start web
  ```
- Untuk domain + HTTPS: pasang Caddy di host memakai
  `deploy/Caddyfile.contoh` (ganti `localhost:3000` → tetap sama, karena
  port sudah dipublikasikan ke host).

---

## 6. Opsi D — PaaS (Railway / Render / Fly.io)

Bisa langsung, syaratnya **persistent disk** untuk file SQLite:

| Platform | Catatan |
|---|---|
| **Railway** | Tambah Volume dan mount ke `/app/db` (atau `/data` + `DATABASE_URL=file:/data/custom.db`); Build `bun run build`, Start `bun run start` |
| **Render** | Pakai Docker runtime (image dari Dockerfile ini) + Persistent Disk di `/app/db` |
| **Fly.io** | Volume `.flyctl volumes create` di `/app/db` |
| ❌ Vercel / Netlify | **Tidak cocok** — serverless tanpa disk persisten & SQLite file tidak bisa dipakai (harus migrasi ke Postgres) |

Variabel environment yang perlu diisi di PaaS: `DATABASE_URL` (path absolut
di dalam disk persisten).

---

## 7. Migrasi database (pindahkan semua data Anda)

> **SATU file `db/custom.db` = seluruh isi website Anda** (produk,
> pengaturan, gambar base64, chat, kontak).

**Urutan aman (penting — hindari backup setengah jadi):**

1. **Matikan sumber dulu** di lingkungan lama (server menulis log WAL;
   menyalin saat berjalan bisa menghasilkan salinan usang — pelajaran dari
   Task 67):
   ```bash
   # bila memakai systemd: sudo systemctl stop b2b-katalog
   # bila Docker:         docker compose stop web
   ```
2. Salin `db/custom.db` ke lokasi baru (folder/db sesuai `DATABASE_URL`).
3. Pastikan folder db **bisa ditulis** user server (WAL/ShM akan dibuat):
   `chown -R deploy:deploy /opt/b2b-katalog/db`
4. Nyalakan server, lalu verifikasi: buka website (produk tampil) →
   login admin (pengaturan lama terbaca) → kirim chat uji.

---

## 7b. Sinkronisasi otomatis ke GitHub (cadangan kode + data)

Skrip siap pakai: `scripts/sambungkan-github.sh` (tanpa dependensi tambahan).

**Siapkan (sekali, di GitHub):**

1. Buat repo kosong — **PRIVAT** disarankan (database ikut disimpan) —
   tanpa README, mis. `https://github.com/nama-anda/katalog-b2b.git`.
2. Buat Personal Access Token: GitHub → Settings → Developer settings →
   **Personal access tokens** → Generate new token → beri centang scope
   `repo` (classic) atau *Contents: Read and write* (fine-grained).
   Salin token (berawalan `ghp_` / `github_pat_`).

**Sambungkan (sekali):**

```bash
cd /opt/b2b-katalog   # atau folder proyek di sandbox
bash scripts/sambungkan-github.sh https://github.com/nama-anda/katalog-b2b.git ghp_TOKENANDA
```

*   Menyimpan token di `.git-kredensial` (chmod 600, diabaikan git) dan
    mendorong seluruh riwayat `main`.
*   Ingin repo GitHub berisi **1 commit bersih tanpa riwayat lama** (riwayat
    lama memuat database usang)? Tambahkan `--riwayat-baru`.

**Nyalakan sinkron otomatis (tiap 10 menit, bila ada perubahan):**

```bash
bash scripts/sambungkan-github.sh --auto        # nyalakan
bash scripts/sambungkan-github.sh --status      # cek status
bash scripts/sambungkan-github.sh --stop-auto   # matikan
```

> Di VPS, agar auto-sync tetap hidup setelah reboot, jalankan lewat unit
> systemd `Type=simple` yang memanggil
> `bash scripts/auto-push-github.sh` (contoh pola: `deploy/b2b-chat.service`).

**Keamanan:** token bocor → cabut di Settings → Developer settings; token
hanya disimpan lokal, tidak pernah ikut commit.

---

## 8. Update versi aplikasi

```bash
cd /opt/b2b-katalog
# 1. backup dulu (bagian 9)
# 2. tarik kode baru
rsync/git pull ...
bun install && bun run db:generate
bun run db:push          # hanya bila schema berubah
bun run build
sudo systemctl restart b2b-katalog
```

Docker: `docker compose up -d --build` (data aman di volume).

---

## 9. Backup berkala

Cara paling andal untuk SQLite (aman walau server hidup):

```bash
# bila ada sqlite3:
sqlite3 /opt/b2b-katalog/db/custom.db ".backup '/var/backups/custom-$(date +%F).db'"
# bila tanpa sqlite3: matikan server → salin file → nyalakan lagi
```

Pasang cron harian, simpan minimal 7 hari. **Uji pulihkan** sesekali:
restore salinan ke folder lain, arahkan `DATABASE_URL`, boot, cek produk.

---

## 10. Checklist keamanan produksi

- [ ] **Ganti sandi admin** — Admin Panel → Akun → *Ganti Kata Sandi*
      (sandi bawaan `admin123` wajib diganti sebelum tayang publik)
- [ ] **Ganti kunci akses admin** — Admin Panel → Akun → *Kunci Akses Admin*
      (bawaan `goldenbee-admin`)
- [ ] HTTPS aktif (Caddy otomatis) — jangan tayang lewat `http://`
- [ ] Firewall: hanya `22, 80, 443`. **JANGAN** ekspos `3000`/`3003` ke publik
      (ikat ke localhost: `HOSTNAME=127.0.0.1` bila Caddy satu mesin)
- [ ] Backup harian berjalan (bagian 9)
- [ ] Jangan commit `.env` ke repositori publik

---

## 11. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Halaman **blank / spinner "Memuat katalog…" tanpa batas** | `DATABASE_URL` salah/tidak ada → semua API DB gagal (kasus Task 68) | Cek env server: `sudo systemctl show b2b-katalog -p Environment`; lihat log; pastikan file DB ada & path absolut benar |
| Katalog tampil tapi **pengaturan tidak tersimpan** | Folder db tidak bisa ditulis (WAL) | `chown -R user:user db/`; cek permission |
| **Peta** tidak tampil | Link peta di Admin Panel tidak valid / Google memblokir | Periksa Admin Panel → Tampilan → Link Peta; bila Google memblokir, tampil kartu cadangan "Lihat Lokasi Kami" (normal) |
| **Live chat tidak realtime** (masuk-masuk telat beberapa detik) | Chat service :3003 tidak jalan / Caddy tanpa blok `XTransformPort` | Nyalakan `b2b-chat` (atau profil Docker `chat`); pastikan Caddyfile.contoh dipakai. Tanpa itu chat tetap jalan lewat HTTP |
| **Gambar hilang** setelah pindah server | DB yang dipakai bukan DB asli (gambar ada di DB, base64) | Ulangi migrasi bagian 7 dengan `custom.db` yang benar |
| `Environment variable not found: DATABASE_URL` | `.env` tidak terbaca / env tidak di-set | Set di `.env` (root proyek) ATAU di unit systemd/compose |
| Port 3000 sudah dipakai | Layanan lain | Ganti `PORT` di env + sesuaikan Caddyfile |

---

*Dokumen ini dibuat otomatis dari hasil audit proyek (Task 69). Semua
perintah mengikuti rantai build/publish yang telah diverifikasi end-to-end.*
