#!/bin/bash
# ensure-chat.sh — menyalakan chat-service (:3003) secara IDEMPOTEN dan
# TERVERIFIKASI. Dipakai bersama oleh watchdog (dev-watchdog.sh) dan
# start-dev.sh (pembuka `bun run dev`).
#
# Masalah yang diselesaikan (Task 52/53):
# - Proses bun --hot yang servernya mati TIDAK selalu keluar (mode hot reload
#   tetap hidup) → "zombie": proses ada tapi port tidak terpasang, dan
#   menumpuk memakan RAM (pemicu OOM di mesin 4GB).
# - Restart terlalu cepat bisa gagal bind karena socket lama belum lepas.
#
# Jaminan keluaran: exit 0 HANYA bila :3003 terbukti sehat (health endpoint).

ROOT="/home/z/my-project"
CS_DIR="$ROOT/mini-services/chat-service"
LOG="$ROOT/chat-service.log"
BUN_BIN="$(command -v bun || echo /home/z/.bun/bin/bun)"

sehat() { curl -sf -o /dev/null --max-time 3 "http://127.0.0.1:3003/api/chat/health" 2>/dev/null; }

# Bunuh SEMUA proses bun yang cwd-nya folder chat-service (termasuk zombie).
bersihkan_chat_bun() {
  local pid cwd
  for pid in $(pgrep -x bun 2>/dev/null); do
    cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null)
    if [ "$cwd" = "$CS_DIR" ]; then
      kill "$pid" 2>/dev/null
    fi
  done
  sleep 1
  for pid in $(pgrep -x bun 2>/dev/null); do
    cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null)
    if [ "$cwd" = "$CS_DIR" ]; then
      kill -9 "$pid" 2>/dev/null
    fi
  done
  # Tunggu port :3003 benar-benar lepas (maks ±6 dtk).
  local i
  for i in $(seq 1 12); do
    if ! ss -tln 2>/dev/null | grep -q ':3003 '; then
      return 0
    fi
    sleep 0.5
  done
  return 0
}

nyalakan() {
  cd "$CS_DIR" || return 1
  setsid nohup "$BUN_BIN" --hot index.ts >> "$LOG" 2>&1 < /dev/null &
  # Tunggu sehat (maks ±10 dtk).
  local i
  for i in $(seq 1 20); do
    if sehat; then return 0; fi
    sleep 0.5
  done
  return 1
}

# Sudah sehat? Tidak melakukan apa-apa (idempoten).
if sehat; then
  exit 0
fi

bersihkan_chat_bun
if nyalakan; then
  exit 0
fi

# Percobaan kedua (terakhir): bersihkan lagi, nyalakan lagi.
bersihkan_chat_bun
if nyalakan; then
  exit 0
fi

echo "[ensure-chat] GAGAL menyalakan chat-service setelah 2 percobaan" >> "$LOG"
exit 1
