# ==================================================================
# Dockerfile — Website Katalog Supplier B2B (Next.js + SQLite)
#
# Membangun image produksi yang mengikuti ALUR YANG SAMA dengan
# rantai publish yang sudah terverifikasi di sandbox:
#   bun install → prisma db push → next build (output standalone)
#   → NODE_ENV=production bun .next/standalone/server.js
#
# Gunakan bersama docker-compose.yml (lihat PANDUAN-HOSTING.md).
# ==================================================================
FROM oven/bun:1

# Prisma engine (libquery_engine-debian-openssl-3.0.x) butuh OpenSSL 3
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ------------------------------------------------------------------
# 1) Dependensi — layer terpisah agar cache Docker efektif.
#    Proyek ini TIDAK memakai postinstall, jadi prisma generate
#    dijalankan eksplisit agar client siap sebelum build.
# ------------------------------------------------------------------
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
RUN bunx prisma generate

# ------------------------------------------------------------------
# 2) Sisa kode proyek
# ------------------------------------------------------------------
COPY . .

# ------------------------------------------------------------------
# 3) Siapkan database SQLite kosong sesuai schema.
#    Saat produksi NYATA, file db/custom.db milik Anda (berisi semua
#    produk/pengaturan) dipasang lewat VOLUME di /app/db — entrypoint
#    hanya membuat DB baru bila volume kosong.
# ------------------------------------------------------------------
ENV DATABASE_URL="file:/app/db/custom.db"
RUN mkdir -p /app/db && bunx prisma db push --skip-generate

# ------------------------------------------------------------------
# 4) Build produksi (script "build" juga menyalin static, public,
#    .env, dan Prisma client/engine ke .next/standalone)
# ------------------------------------------------------------------
RUN bun run build

# ------------------------------------------------------------------
# 5) Runtime
# ------------------------------------------------------------------
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
# "bun run start" = NODE_ENV=production bun .next/standalone/server.js
CMD ["bun", "run", "start"]
