#!/bin/sh
# ==================================================================
# Entrypoint Docker — pastikan file database tersedia sebelum server
# berjalan. Bila volume /app/db kosong (penyalaan pertama), DB dibuat
# dari schema Prisma. Bila Anda sudah memasang custom.db asli lewat
# volume, file itu yang langsung dipakai.
# ==================================================================
set -e

mkdir -p /app/db

if [ ! -f /app/db/custom.db ]; then
  echo "[entrypoint] Volume database kosong — membuat DB baru dari schema Prisma..."
  cd /app
  bunx prisma db push --skip-generate
  echo "[entrypoint] Database baru siap di /app/db/custom.db"
fi

cd /app
exec "$@"
