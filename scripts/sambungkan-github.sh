#!/usr/bin/env bash
# ============================================================
# SAMBUNGKAN & SINKRONISASI OTOMATIS KE GITHUB
# Website Katalog Supplier B2B — Golden Bee Indonesia
# ============================================================
# Pemakaian:
#   bash scripts/sambungkan-github.sh <URL-repo> <TOKEN> [opsi]
#     <URL-repo> : https://github.com/nama-anda/nama-repo.git
#     <TOKEN>    : Personal Access Token GitHub (lihat PANDUAN-HOSTING.md)
#     Opsi:
#       --riwayat-baru  Dorong sebagai 1 commit bersih TANPA riwayat lama
#                       (riwayat lama memuat database & data usang — pilih
#                       ini bila repo GitHub ingin bersih/aman)
#       --publik        Lewati peringatan repo privat (tidak disarankan)
#   bash scripts/sambungkan-github.sh --status      # lihat status koneksi
#   bash scripts/sambungkan-github.sh --auto        # nyalakan sinkron otomatis
#   bash scripts/sambungkan-github.sh --stop-auto   # matikan sinkron otomatis
#
# Keamanan:
#   • Token disimpan di .git-kredensial (chmod 600, TIDAK ikut git).
#   • Gunakan token dengan izin minimum (scope "repo" untuk repo privat).
#   • Sebaiknya repo GitHub bersifat PRIVAT karena database ikut disimpan.
#   • Token bocor? Cabut di GitHub → Settings → Developer settings.
set -uo pipefail

PROYEK="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROYEK" || exit 1

KREDENSIAL="$PROYEK/.git-kredensial"
BRANCH="main"
PID_AUTO="/tmp/auto-push-github.pid"
LOG_AUTO="$PROYEK/auto-push-github.log"

cetak_penggunaan() {
  cat <<'PAKAI'
Cara pakai:
  bash scripts/sambungkan-github.sh <URL-repo> <TOKEN> [--riwayat-baru] [--publik]
  bash scripts/sambungkan-github.sh --status
  bash scripts/sambungkan-github.sh --auto
  bash scripts/sambungkan-github.sh --stop-auto

Contoh:
  bash scripts/sambungkan-github.sh https://github.com/budi/katalog-b2b.git ghp_xxxxxxxx
PAKAI
}

pasang_kredensial() {
  local url="$1" token="$2"
  local host user
  host="$(printf '%s\n' "$url" | sed -E 's#https?://([^/]+)/.*#\1#')"
  user="$(printf '%s\n' "$url" | sed -E 's#https?://[^/]+/([^/]+)/.*#\1#')"
  [ -z "$user" ] && user="token"
  printf 'https://%s:%s@%s\n' "$user" "$token" "$host" > "$KREDENSIAL"
  chmod 600 "$KREDENSIAL"
  git config credential.helper "store --file=$KREDENSIAL"
}

# ---------- Mode: status ----------
if [ "${1:-}" = "--status" ]; then
  echo "── Status koneksi GitHub ──"
  if git remote get-url origin >/dev/null 2>&1; then
    echo "Remote  : $(git remote get-url origin)"
    echo "Branch  : $BRANCH"
    echo "Commit lokal belum terdorong: $(git rev-list --count origin/$BRANCH..$BRANCH 2>/dev/null || echo '?')"
    if [ -f "$PID_AUTO" ] && kill -0 "$(cat "$PID_AUTO" 2>/dev/null)" 2>/dev/null; then
      echo "Auto-sync: AKTIF (pid $(cat "$PID_AUTO"))"
    else
      echo "Auto-sync: mati (nyalakan dengan --auto)"
    fi
    git fetch origin --quiet 2>/dev/null && echo "Terhubung ke GitHub: YA" || echo "Terhubung ke GitHub: TIDAK (cek internet/token)"
  else
    echo "Belum tersambung. Jalankan:"
    cetak_penggunaan
  fi
  exit 0
fi

# ---------- Mode: auto-sync ----------
if [ "${1:-}" = "--auto" ]; then
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "✗ Belum ada remote. Sambungkan dulu: bash scripts/sambungkan-github.sh <URL> <TOKEN>"
    exit 1
  fi
  if [ -f "$PID_AUTO" ] && kill -0 "$(cat "$PID_AUTO" 2>/dev/null)" 2>/dev/null; then
    echo "Auto-sync sudah berjalan (pid $(cat "$PID_AUTO"))."
    exit 0
  fi
  nohup bash "$PROYEK/scripts/auto-push-github.sh" >> "$LOG_AUTO" 2>&1 &
  echo $! > "$PID_AUTO"
  echo "✓ Auto-sync dinyalakan (pid $(cat "$PID_AUTO")) — commit & dorong tiap 10 menit bila ada perubahan."
  echo "  Log: $LOG_AUTO  |  Matikan dengan: bash scripts/sambungkan-github.sh --stop-auto"
  exit 0
fi

# ---------- Mode: stop auto ----------
if [ "${1:-}" = "--stop-auto" ]; then
  if [ -f "$PID_AUTO" ] && kill "$(cat "$PID_AUTO")" 2>/dev/null; then
    rm -f "$PID_AUTO"; echo "✓ Auto-sync dimatikan."
  else
    echo "Auto-sync tidak sedang berjalan."
  fi
  exit 0
fi

# ---------- Mode: sambungkan ----------
URL="${1:-}"
TOKEN="${2:-}"
RIWAYAT_BARU=0
INGIN_PUBLIK=0
for arg in "${@:3}"; do
  case "$arg" in
    --riwayat-baru) RIWAYAT_BARU=1 ;;
    --publik) INGIN_PUBLIK=1 ;;
  esac
done

if [ -z "$URL" ] || [ -z "$TOKEN" ]; then
  cetak_penggunaan; exit 1
fi
if ! printf '%s' "$URL" | grep -qE '^https://[^/]+/[^/]+/[^/]+'; then
  echo "✗ URL tidak valid. Contoh: https://github.com/nama-anda/nama-repo.git"
  exit 1
fi
if [ "$INGIN_PUBLIK" -ne 1 ]; then
  echo "ℹ️  Ingat: buat repo GitHub sebagai PRIVAT (berisi database katalog)."
  echo "   (Tambahkan bendera --publik untuk melewati peringatan ini)"
fi

pasang_kredensial "$URL" "$TOKEN"
git remote remove origin >/dev/null 2>&1 || true
git remote add origin "$URL"
echo "✓ Remote origin = $URL"

if [ "$RIWAYAT_BARU" -eq 1 ]; then
  echo "→ Mode riwayat baru: menyiapkan 1 commit bersih dari berkas ter-track…"
  BERSIH="/tmp/repo-github-bersih"
  rm -rf "$BERSIH"; mkdir -p "$BERSIH"
  git archive "$BRANCH" | tar -x -C "$BERSIH"
  ( cd "$BERSIH" \
    && git init -q -b "$BRANCH" \
    && git add -A \
    && git -c user.name="${GIT_AUTHOR_NAME:-Golden Bee}" -c user.email="${GIT_AUTHOR_EMAIL:-admin@local}" \
       commit -q -m "Website Katalog Supplier B2B — kode & data awal" \
    && git remote add origin "$URL" \
    && git -c credential.helper="store --file=$KREDENSIAL" push -q -u origin "$BRANCH" --force )
  if [ $? -eq 0 ]; then
    echo "✓ Berhasil! Repo GitHub kini berisi 1 commit bersih (tanpa riwayat lama)."
    echo "  Catatan: repo lokal tetap memakai riwayatnya; sinkron berikutnya bisa"
    echo "  memakai --riwayat-baru lagi bila ingin mengulang pola ini."
  else
    echo "✗ Gagal mendorong. Periksa: repo sudah dibuat? token benar? izin 'Contents: Read and write'?"
    exit 1
  fi
else
  echo "→ Mendorong seluruh riwayat ($BRANCH, $(git rev-list --count HEAD) commit, ±$(du -sh .git | cut -f1))…"
  if git push -u origin "$BRANCH"; then
    echo "✓ Berhasil! Seluruh riwayat kini ada di GitHub."
  else
    echo "✗ Gagal mendorong. Periksa:"
    echo "   1) Repo sudah dibuat di GitHub (nama sama dengan URL)?"
    echo "   2) Token benar & punya izin repo (classic: scope 'repo')?"
    echo "   3) Internet keluar tersedia?"
    exit 1
  fi
fi

echo
echo "Langkah terakhir — sinkron OTOMATIS: bash scripts/sambungkan-github.sh --auto"
