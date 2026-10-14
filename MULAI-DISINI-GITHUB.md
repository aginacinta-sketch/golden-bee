# ⬆️ MULAI DI SINI — Upload Proyek ke GitHub

Repo ini **sudah siap push**: struktur folder lengkap, riwayat git baru & bersih (1 commit), dan database `db/custom.db` sudah termasuk sebagai cadangan data katalog Anda.

> Total ±200 berkas, ±31 MB. Semua berkas di bawah batas GitHub (100 MB/berkas).

---

## Cara A — Skrip otomatis ⭐ (paling mudah, direkomendasikan)

**1. Buat repo kosong di GitHub**
- Buka <https://github.com/new>
- Nama bebas, mis. `golden-bee-katalog`
- Pilih **Private** (disarankan — berisi data bisnis Anda)
- **JANGAN** centang "Add a README" / .gitignore / license (repo harus kosong)

**2. Buat token akses (PAT)**
- Buka <https://github.com/settings/tokens> → **Generate new token (classic)**
- Catatan bebas, kedaluwarsa pilih lama (mis. 90 hari/No expiration)
- Centang scope **`repo`** → **Generate token** → **salin token** (`ghp_...`)

**3. Sambungkan & dorong (satu perintah)**

```bash
bash scripts/sambungkan-github.sh https://github.com/USERNAME/golden-bee-katalog.git ghp_TOKEN_ANDA
```

Skrip akan: menyimpan token di `.git-kredensial` **hanya di komputer ini** (dikecualikan dari git, izin 600), memasang remote, dan mendorong seluruh isi repo.

**4. (Opsional) Nyalakan sinkron otomatis**

```bash
bash scripts/sambungkan-github.sh --auto
```

Setiap 10 menit: kalau ada perubahan file → commit "Sinkron otomatis…" → push. Matikan dengan `--stop-auto`, cek status dengan `--status`.

---

## Cara B — Terminal manual

```bash
git remote add origin https://USERNAME:ghp_TOKEN_ANDA@github.com/USERNAME/golden-bee-katalog.git
git push -u origin main
```

---

## Cara C — Upload lewat web (drag & drop) ⚠️ ada batasan

Bisa di <https://github.com/USERNAME/NAMA-REPO/upload/main>, **tetapi**:

| Batasan GitHub web | Dampak ke repo ini |
|---|---|
| Maks **100 berkas** per unggahan | ±200 berkas → harus tarik per folder, beberapa kali |
| Maks **25 MB** per berkas lewat web | `db/custom.db` (27 MB) **tidak akan bisa** diunggah cara ini |

➡️ Kesimpulan: pakai **Cara A atau B** supaya database ikut terunggah. Cara C hanya bila Anda sengaja ingin tanpa database (data akan kosong saat di-clone).

---

## Setelah berhasil — apa yang Anda dapat

1. **Cadangan lengkap di cloud** — kode + data produk + pengaturan (termasuk link QR admin), privat.
2. **Deploy di mana saja** — `git clone` di VPS lalu ikuti [`PANDUAN-HOSTING.md`](PANDUAN-HOSTING.md).
3. **Sinkron dua arah dari sandbox** — perubahan di sini otomatis terdorong (Cara A langkah 4).

## Keamanan token

- Token **tidak pernah** masuk git/repo GitHub (`.gitignore` menahan `.git-kredensial`).
- Remote tersimpan bersih tanpa token; URL asli aman dibagikan.
- Token bocor/kehilangan? Hapus di <https://github.com/settings/tokens> lalu buat baru.
