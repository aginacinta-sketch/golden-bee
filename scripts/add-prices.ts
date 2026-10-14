/**
 * Sekali pakai: isi estimasi harga untuk produk demo yang sudah ada di DB.
 * Jalankan: bun run scripts/add-prices.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PRICES: Record<string, { min: number; max: number }> = {
  "Stroberi Freeze-Dried": { min: 85000, max: 120000 },
  "Biji Kopi Arabica Sangrai": { min: 115000, max: 145000 },
  Nangka: { min: 8500, max: 12000 },
  "Madu Hutan Murni": { min: 95000, max: 150000 },
  "Nanas Madu": { min: 7000, max: 11000 },
  "Buah Naga Merah": { min: 14000, max: 19000 },
  "Serat Sisal Alami": { min: 750000, max: 950000 },
  "Gula Kelapa Organik": { min: 28000, max: 38000 },
};

async function main() {
  const products = await db.product.findMany({ where: { priceMin: null, priceMax: null } });
  let updated = 0;
  for (const p of products) {
    const hit = PRICES[p.name];
    if (!hit) continue;
    await db.product.update({ where: { id: p.id }, data: { priceMin: hit.min, priceMax: hit.max } });
    updated++;
  }
  console.log(`✓ ${updated} produk diperbarui dengan estimasi harga`);
}

main()
  .catch((e) => {
    console.error("❌ Gagal:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
