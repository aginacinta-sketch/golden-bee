#!/usr/bin/env bash
# ====================================================================
# cek-vps.sh — Cek kompatibilitas VPS untuk Website Katalog Supplier B2B
#
# CARA PAKAI di VPS Anda:
#   bash cek-vps.sh
#
# Skrip ini HANYA MEMBACA kondisi server (tidak mengubah apa pun) dan
# menilai: OS, arsitektur, RAM, disk, port, internet, OpenSSL, systemd,
# serta keberadaan Bun/Docker. Hasil: ringkasan LULUS / PERLU PERBAIKAN.
# ====================================================================
set -u

OK=0; PERINGATAN=0; GAGAL=0
pass() { echo "  ✅ [LULUS] $1"; OK=$((OK+1)); }
warn() { echo "  ⚠️  [CATATAN] $1"; PERINGATAN=$((PERINGATAN+1)); }
fail() { echo "  ❌ [GAGAL] $1"; GAGAL=$((GAGAL+1)); }
line() { echo; echo "── $1 " ; }

echo "════════════════════════════════════════════════════════"
echo "  CEK KOMPATIBILITAS VPS — Katalog Supplier B2B"
echo "════════════════════════════════════════════════════════"

line "1. Sistem Operasi & Arsitektur"
if [ -r /etc/os-release ]; then
    . /etc/os-release
    case "${ID:-}" in
        ubuntu|debian) pass "OS: ${PRETTY_NAME:-$ID} (didukung penuh)" ;;
        *) warn "OS: ${PRETTY_NAME:-$ID} — bisa jalan, panduan ditulis untuk Ubuntu/Debian" ;;
    esac
else
    warn "Tidak bisa membaca /etc/os-release"
fi
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64) pass "Arsitektur: x86_64" ;;
    aarch64) warn "Arsitektur: aarch64 (ARM) — didukung, engine Prisma versi ARM otomatis" ;;
    *) fail "Arsitektur tidak umum: $ARCH" ;;
esac

line "2. Sumber Daya (RAM / Disk / CPU)"
CORES="$(nproc 2>/dev/null || echo 1)"
RAM_MB="$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')"
DISK_GB="$(df -BG / 2>/dev/null | awk 'NR==2{gsub("G","",$4); print $4}')"
if [ "${RAM_MB:-0}" -ge 1800 ]; then pass "RAM: ${RAM_MB}MB (aman untuk build)"; 
elif [ "${RAM_MB:-0}" -ge 900 ]; then warn "RAM: ${RAM_MB}MB — cukup untuk menjalankan, BUILD di komputer lokal (lihat panduan B5)"; 
else fail "RAM: ${RAM_MB}MB — terlalu kecil"; fi
if [ "${DISK_GB:-0}" -ge 8 ]; then pass "Disk tersedia: ${DISK_GB}GB";
elif [ "${DISK_GB:-0}" -ge 4 ]; then warn "Disk tersedia: ${DISK_GB}GB — pas-pasan (image build butuh ±3GB)";
else fail "Disk tersedia: ${DISK_GB}GB — terlalu kecil"; fi
if [ "$CORES" -ge 1 ]; then pass "CPU: ${CORES} core"; fi

line "3. Port yang Dibutuhkan (80, 443, 3000, 3003)"
BEbas=1
for p in 80 443 3000 3003; do
    if command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${p}$"; then
        fail "Port $p SUDAH DIPAKAI aplikasi lain"
        BEbas=0
    fi
done
[ "$BEbas" = 1 ] && pass "Semua port bebas (80, 443, 3000, 3003)"

line "4. Koneksi Internet (untuk install & sertifikat HTTPS)"
for u in https://bun.sh https://github.com; do
    if curl -sI --max-time 8 -o /dev/null "$u" 2>/dev/null; then
        pass "Terhubung: $u"
    else
        fail "TIDAK bisa menghubungi $u (cek firewall outbound)"
    fi
done

line "5. OpenSSL (engine Prisma butuh ≥ 3.0)"
if command -v openssl >/dev/null 2>&1; then
    V="$(openssl version | awk '{print $2}')"
    MAJ="$(echo "$V" | cut -d. -f1)"
    if [ "${MAJ:-0}" -ge 3 ]; then pass "OpenSSL $V"; else fail "OpenSSL $V — terlalu lama (butuh 3.x)"; fi
else
    fail "OpenSSL tidak ditemukan — jalankan: sudo apt install -y openssl"
fi

line "6. Layanan Pendukung"
command -v systemctl >/dev/null 2>&1 && pass "systemd tersedia (untuk service otomatis)" || warn "systemd tidak terdeteksi"
command -v caddy >/dev/null 2>&1 && pass "Caddy sudah terpasang" || warn "Caddy belum terpasang — panduan B7 menyertakan install"
command -v bun >/dev/null 2>&1 && pass "Bun sudah terpasang: $(bun --version 2>/dev/null)" || warn "Bun belum terpasang — panduan B2 menyertakan install"
command -v docker >/dev/null 2>&1 && pass "Docker tersedia (opsi C bisa dipakai)" || warn "Docker tidak ada (hanya perlu bila memilih Opsi C)"

line "7. Firewall"
if command -v ufw >/dev/null 2>&1 && sudo -n ufw status >/dev/null 2>&1; then
    ST="$(sudo -n ufw status 2>/dev/null | head -1)"
    echo "  ℹ️  UFW: $ST (pastikan 22,80,443 terbuka — panduan B1)"
else
    warn "UFW tidak terbaca (butuh sudo) — pastikan port 22, 80, 443 terbuka di provider"
fi

echo
echo "════════════════════════════════════════════════════════"
echo "  RINGKASAN: ${OK} lulus, ${PERINGATAN} catatan, ${GAGAL} gagal"
echo "════════════════════════════════════════════════════════"
if [ "$GAGAL" -eq 0 ]; then
    echo "  🎉 VPS Anda SIAP mengikuti PANDUAN-HOSTING.md (Opsi B atau C)."
    echo "     Catatan (⚠️) bukan penghalang — cukup ikuti saran di panduan."
    exit 0
else
    echo "  🛠  Perbaiki item ❌ di atas (atau pilih VPS lain), lalu jalankan lagi."
    exit 1
fi
