#!/bin/bash
# start-dev.sh — pembuka lengkap aplikasi; dipanggil oleh `bun run dev`.
#
# Task 52: livechat kini hidup DI DALAM Next.js (API route + polling), jadi
# tidak ada lagi chat-service :3003 yang harus disiapkan. Yang tetap dijaga:
# watchdog (satu instance, lewat pidfile) agar dev server selalu pulih —
# termasuk ketika proses publish menjalankan `next build` yang menekan RAM.
#
# Semua langkah idempoten: aman dipanggil berulang kapan pun.

ROOT="/home/z/my-project"
cd "$ROOT" || exit 1

# 1) Watchdog — hanya bila belum ada yang hidup (pidfile).
if ! [ -f .watchdog.pid ] || ! kill -0 "$(cat .watchdog.pid 2>/dev/null)" 2>/dev/null; then
  setsid nohup bash scripts/dev-watchdog.sh >> watchdog-stdout.log 2>&1 < /dev/null &
fi

# 2) Dev server Next.js di foreground — perilaku lama dipertahankan penuh.
./node_modules/.bin/next dev -p 3000 2>&1 | tee dev.log
