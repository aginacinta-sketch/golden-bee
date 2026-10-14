#!/usr/bin/env bash
# Penjaga server (pengganti watchdog Task 51 yang hilang saat restore workspace).
#
# Tujuan: setelah PUBLISH (bun run build → next build), proses dev server &
# chat-service bisa mati. Watchdog memastikan keduanya hidup kembali.
#
# Aman terhadap server produksi standalone (bun .next/standalone/server.js yang
# dijalankan platform setelah publish):
#   - Jika :3000 merespons → TIDAK melakukan apa pun (apa pun servernya).
#   - Jika :3000 tidak merespons:
#       * Ada proses/port terkait (sedang build / server macet) → tunggu;
#         bila > 10 menit tetap mati → paksa hentikan & nyalakan dev server.
#       * Tidak ada proses sama sekali → langsung nyalakan dev server.
#   - Chat-service dijaga lewat handshake socket.io :3003 (tidak ada route HTTP).

PROJEK=/home/z/my-project
LOG="$PROJEK/watchdog.log"

GAGAL_WEB=0
DETAK_WEB=0
GAGAL_CHAT=0

log() { echo "[$(date '+%d/%m %H:%M:%S')] $*" >> "$LOG"; }

pid_port() {
  # ambil pid proses yang memegang port tertentu dari output ss -tlnp
  ss -tlnp 2>/dev/null | grep ":$1 " | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2
}

hidupkan_dev() {
  log "Menyalakan dev server :3000 ..."
  cd "$PROJEK" || return
  nohup bun run dev >> "$LOG" 2>&1 &
  cd - >/dev/null || true
  sleep 30
}

hidupkan_chat() {
  log "Menyalakan chat-service :3003 ..."
  cd "$PROJEK/mini-services/chat-service" || return
  nohup bun run dev >> "$LOG" 2>&1 &
  cd - >/dev/null || true
  sleep 5
}

log "Watchdog mulai (pid $$)."

while true; do
  # ---------- Website :3000 ----------
  if curl -s -o /dev/null --max-time 10 http://127.0.0.1:3000; then
    GAGAL_WEB=0
    DETAK_WEB=0
  else
    GAGAL_WEB=$((GAGAL_WEB + 1))
    ADA_PROSES=$(pgrep -f "next dev|next-server|standalone/server.js" | head -1)
    PID_PORT=$(pid_port 3000)
    if [ -n "$ADA_PROSES" ] || [ -n "$PID_PORT" ]; then
      DETAK_WEB=$((DETAK_WEB + 1))
      log "Port 3000 tak merespons (percobaan $GAGAL_WEB) namun ada proses (pid=${ADA_PROSES:-$PID_PORT}) — kemungkinan build berjalan, menunggu ($DETAK_WEB/30)."
      if [ "$DETAK_WEB" -ge 30 ]; then
        log "> 10 menit tak merespons — paksa hentikan lalu nyalakan dev server."
        pkill -f "next dev" 2>/dev/null
        pkill -f "next-server" 2>/dev/null
        pkill -f "standalone/server.js" 2>/dev/null
        [ -n "$PID_PORT" ] && kill -9 "$PID_PORT" 2>/dev/null
        sleep 3
        hidupkan_dev
        GAGAL_WEB=0
        DETAK_WEB=0
      fi
    else
      log "Port 3000 mati tanpa proses — menyalakan dev server."
      hidupkan_dev
      GAGAL_WEB=0
      DETAK_WEB=0
    fi
  fi

  # ---------- Chat-service :3003 ----------
  if curl -s -o /dev/null --max-time 8 "http://127.0.0.1:3003/socket.io/?EIO=4&transport=polling"; then
    GAGAL_CHAT=0
  else
    GAGAL_CHAT=$((GAGAL_CHAT + 1))
    PID_CHAT=$(pid_port 3003)
    if [ -z "$PID_CHAT" ]; then
      log "Chat-service :3003 mati tanpa proses — menyalakan ulang."
      hidupkan_chat
      GAGAL_CHAT=0
    elif [ "$GAGAL_CHAT" -ge 15 ]; then
      log "Chat-service tak merespons 5 menit (pid=$PID_CHAT) — restart paksa."
      kill -9 "$PID_CHAT" 2>/dev/null
      sleep 2
      hidupkan_chat
      GAGAL_CHAT=0
    fi
  fi

  # ---------- Sinkron otomatis GitHub ----------
  # Setelah restart sandbox, proses auto-push mati & berkas pid/log (di luar
  # git) bisa hilang. Watchdog menyalakannya kembali bila remote sudah
  # terpasang. Kredensial (.git-kredensial) tidak ikut git — bila hilang,
  # dorong akan gagal kalem di log sampai kredensial dipasang lagi.
  if git -C "$PROJEK" remote get-url origin >/dev/null 2>&1; then
    if ! pgrep -f "auto-push-githu[b].sh" >/dev/null 2>&1; then
      log "Auto-sync GitHub mati — menyalakan kembali."
      nohup bash "$PROJEK/scripts/auto-push-github.sh" >> "$PROJEK/auto-push-github.log" 2>&1 &
      echo $! > /tmp/auto-push-github.pid
    fi
  fi

  sleep 20
done
