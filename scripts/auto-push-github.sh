#!/usr/bin/env bash
# Auto-sync GitHub: tiap 10 menit — commit perubahan (bila ada) lalu dorong
# ke origin/main. Dinyalakan oleh sambungkan-github.sh --auto.
# Log: auto-push-github.log | PID: /tmp/auto-push-github.pid
set -u
cd "$(cd "$(dirname "$0")/.." && pwd)" || exit 1

intensitas_detik="${GITHUB_SYNC_DETIK:-600}"

while true; do
  sleep "$intensitas_detik"
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "[$(date '+%d/%m %H:%M')] ✗ remote origin hilang — berhenti."
    exit 1
  fi
  git add -A >/dev/null 2>&1
  if ! git diff --cached --quiet >/dev/null 2>&1; then
    git -c user.name="Auto Sync" -c user.email="auto-sync@local" \
      commit -q -m "Sinkron otomatis: cadangan kode & data ($(date '+%d %b %Y %H:%M'))" || true
    echo "[$(date '+%d/%m %H:%M')] commit lokal dibuat."
  fi
  if git push origin main >/dev/null 2>&1; then
    echo "[$(date '+%d/%m %H:%M')] ✓ terdorong ke GitHub."
  else
    echo "[$(date '+%d/%m %H:%M')] ✗ dorong gagal (internet/token/repo?) — dicoba ulang periode berikutnya."
  fi
done
