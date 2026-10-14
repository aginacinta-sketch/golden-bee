/**
 * Seed data demo untuk Katalog Supplier B2B
 * Jalankan: bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const db = new PrismaClient();
const DEMO_DIR = path.join(__dirname, "..", "public", "demo");

// Hanya pakai gambar yang benar-benar ada di /public/demo
const demo = (file: string) => {
  const p = path.join(DEMO_DIR, file);
  return fs.existsSync(p) ? `/demo/${file}` : null;
};

const DEFAULT_SETTINGS: Record<string, string> = {
  brandPrimary: "mitra",
  brandAccent: "dagang",
  headerColor: "#0B3B2E",
  accentColor: "#84BD00",
  supplierName: "PT SUMBER PANGAN NUSANTARA",
  supplierLogo: demo("logo-supplier.jpg") || "",
  supplierFlag: "🇮🇩",
  supplierCountry: "Indonesia",
  supplierAddress: "Jl. Raya Bogor Km 32, Cibinong, Jawa Barat 16912",
  supplierCategory: "Makanan dan Minuman",
  supplierDesc:
    "Kami adalah distributor buah-buahan, sayuran, kacang-kacangan, dan produk agroindustri lainnya seperti \"serat sisal\" dan pemanis alami. Produk kami berkualitas tinggi dengan keragaman yang besar. Kami melayani pemesanan skala kecil hingga kontainer penuh (FCL) dengan pengiriman ke seluruh dunia, didukung sertifikasi ekspor lengkap dan tim merchandiser berpengalaman.",
  tags: JSON.stringify([
    { icon: "handshake", label: "Distributor" },
    { icon: "truck", label: "Grosir" },
    { icon: "globe", label: "Area Pengiriman: Seluruh Dunia" },
  ]),
  contactEmail: "sales@mitradagang.id",
  contactPhone: "+62 21 555 0123",
  whatsapp: "6281234567890",
  aboutTitle: "Tentang Kami",
  aboutText:
    "PT Sumber Pangan Nusantara adalah perusahaan ekspor-impor yang berfokus pada produk pertanian dan makanan olahan Indonesia. Sejak 2009 kami telah memasok lebih dari 500 pembeli di 32 negara, mulai dari retailer, distributor grosir, hingga industri pengolahan makanan.\n\nKami berkomitmen pada kualitas yang konsisten, harga yang kompetitif, dan pengiriman tepat waktu. Setiap produk melewati proses kurasi dan pemeriksaan mutu sebelum dikemas sesuai standar ekspor.",
  footerText:
    "MitraDagang adalah katalog supplier B2B yang menghubungkan pembeli dengan pemasok terpercaya di Indonesia.",
  showWhatsapp: "1",
  showTestimoni: "1",
  showTentang: "1",
};

const MENUS = [
  { label: "Beranda", target: "#beranda", icon: "home", visible: true, order: 1 },
  { label: "Produk", target: "#produk", icon: "package", visible: true, order: 2 },
  { label: "Tentang Kami", target: "#tentang", icon: "info", visible: true, order: 3 },
  { label: "Testimoni", target: "#testimoni", icon: "star", visible: true, order: 4 },
  { label: "Kontak", target: "#kontak", icon: "mail", visible: true, order: 5 },
];

const PRODUCTS: {
  name: string;
  category: string;
  description: string;
  features: string[];
  images: (string | null)[];
  unit: string;
  minOrder: string;
  priceMin: number;
  priceMax: number;
  featured: boolean;
}[] = [
  {
    name: "Stroberi Freeze-Dried",
    category: "Buah Olahan",
    description:
      "Stroberi freeze-dried berkualitas ekspor dengan rasa dan nutrisi yang terkunci maksimal. Tersedia potongan utuh dan serbuk.",
    features: [
      "Mempertahankan rasa & nutrisi intens",
      "Tekstur renyah untuk beragam kegunaan",
      "Serbaguna untuk kue & camilan",
    ],
    images: [demo("stroberi.jpg"), demo("stroberi-b.jpg")],
    unit: "kg",
    minOrder: "50",
    priceMin: 85000,
    priceMax: 120000,
    featured: true,
  },
  {
    name: "Biji Kopi Arabica Sangrai",
    category: "Kopi & Kakao",
    description:
      "Kopi Arabica dataran tinggi Gayo, Aceh dengan profil rasa kompleks. Sangrai tersedia light, medium, hingga dark roast.",
    features: [
      "Rasa dan tekstur superior",
      "Ditanam di dataran tinggi Gayo",
      "Berbagai tingkat sangrai",
    ],
    images: [demo("kopi.jpg"), demo("kopi-b.jpg")],
    unit: "kg",
    minOrder: "100",
    priceMin: 115000,
    priceMax: 145000,
    featured: true,
  },
  {
    name: "Nangka",
    category: "Buah Segar",
    description:
      "Nangka segar dari kebun mitra petani dengan pemanenan harian. Bahan baku populer untuk industri makanan olahan.",
    features: [
      "Buah tropis bintang industri pangan",
      "Kaya serat dan vitamin A",
      "Panen harian dari kebun mitra",
    ],
    images: [demo("nangka.jpg")],
    unit: "kg",
    minOrder: "500",
    priceMin: 8500,
    priceMax: 12000,
    featured: false,
  },
  {
    name: "Madu Hutan Murni",
    category: "Madu",
    description:
      "Madu hutan asli 100% murni tanpa gula tambahan, dipanen langsung dari hutan lestari Sumatera dan Kalimantan.",
    features: [
      "Dipanen langsung dari hutan lestari",
      "100% murni tanpa gula tambahan",
      "Tersedia kemasan 250ml – 30kg",
    ],
    images: [demo("madu.jpg"), demo("madu-b.jpg")],
    unit: "kg",
    minOrder: "200",
    priceMin: 95000,
    priceMax: 150000,
    featured: true,
  },
  {
    name: "Nanas Madu",
    category: "Buah Segar",
    description:
      "Nanas madu varietas unggul dengan rasa manis dan kadar asam rendah. Siap ekspor dengan sertifikat fitosanitasi.",
    features: [
      "Rasa manis, kadar asam rendah",
      "Panen sepanjang tahun",
      "Siap ekspor dengan sertifikat fito",
    ],
    images: [demo("nanas.jpg")],
    unit: "kg",
    minOrder: "1000",
    priceMin: 7000,
    priceMax: 11000,
    featured: false,
  },
  {
    name: "Buah Naga Merah",
    category: "Buah Segar",
    description:
      "Buah naga super merah dengan daging pekat dan manis. Ukuran seragam, dikemas dalam kartu berlubang siap ekspor.",
    features: [
      "Daging merah pekat, rasa manis",
      "Ukuran seragam 300–600 g",
      "Kemasan kartu berlubang ekspor",
    ],
    images: [demo("naga.jpg"), demo("naga-b.jpg")],
    unit: "kg",
    minOrder: "500",
    priceMin: 14000,
    priceMax: 19000,
    featured: false,
  },
  {
    name: "Serat Sisal Alami",
    category: "Serat Alam",
    description:
      "Serat sisal alami grade A dan B untuk industri tali, karpet, dan kerajinan. Kekuatan tarik tinggi dan ramah lingkungan.",
    features: [
      "Biodegradable dengan daya tahan luar ruang",
      "Tahan air, asam, dan aus",
      "Kemurnian tinggi, kotoran minimal",
    ],
    images: [demo("sisal.jpg")],
    unit: "bal",
    minOrder: "10",
    priceMin: 750000,
    priceMax: 950000,
    featured: false,
  },
  {
    name: "Gula Kelapa Organik",
    category: "Pemanis Alami",
    description:
      "Gula kelapa organik dengan indeks glikemik rendah. Bersertifikat organik internasional, cocok untuk pasar kesehatan.",
    features: [
      "Indeks glikemik rendah",
      "Sertifikat organik internasional",
      "Kemasan blok, granul, atau cair",
    ],
    images: [demo("gulakelapa.jpg")],
    unit: "kg",
    minOrder: "300",
    priceMin: 28000,
    priceMax: 38000,
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Budi Santoso",
    role: "Manajer Pembelian",
    company: "FreshMart Retail",
    content:
      "Pasokan buah selalu tepat waktu dan kualitasnya konsisten dari batch ke batch. Tim sales sangat responsif saat kami butuh pengiriman dadakan.",
    rating: 5,
  },
  {
    name: "Yuki Tanaka",
    role: "Head Buyer",
    company: "Kopi Hitam Tokyo Co.",
    content:
      "Biji kopi Gayo terbaik yang pernah kami impor. Dokumen ekspor rapi dan proses bea cukai selalu lancar.",
    rating: 5,
  },
  {
    name: "Ahmed Al-Rashid",
    role: "Import Manager",
    company: "Selera Pangan DMCC",
    content:
      "Madu hutan asli dengan kualitas premium. Pengiriman aman sampai Dubai dan kemasan tidak pernah bocor.",
    rating: 4,
  },
];

async function main() {
  console.log("🌱 Memulai seed data demo…");

  // 1. Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`✓ ${Object.keys(DEFAULT_SETTINGS).length} pengaturan tersimpan`);

  // 2. Menu
  const menuCount = await db.menuItem.count();
  if (menuCount === 0) {
    for (const m of MENUS) await db.menuItem.create({ data: m });
    console.log(`✓ ${MENUS.length} menu navigasi dibuat`);
  } else {
    console.log("• Menu sudah ada, dilewati");
  }

  // 3. Produk
  const productCount = await db.product.count();
  if (productCount === 0) {
    for (let i = 0; i < PRODUCTS.length; i++) {
      const p = PRODUCTS[i];
      await db.product.create({
        data: {
          name: p.name,
          category: p.category,
          description: p.description,
          features: JSON.stringify(p.features),
          images: JSON.stringify(p.images.filter((x): x is string => !!x)),
          unit: p.unit,
          minOrder: p.minOrder,
          priceMin: p.priceMin,
          priceMax: p.priceMax,
          featured: p.featured,
          active: true,
          sortOrder: i + 1,
        },
      });
    }
    console.log(`✓ ${PRODUCTS.length} produk demo dibuat`);
  } else {
    console.log("• Produk sudah ada, dilewati");
  }

  // 4. Testimoni
  const testiCount = await db.testimonial.count();
  if (testiCount === 0) {
    for (let i = 0; i < TESTIMONIALS.length; i++) {
      await db.testimonial.create({ data: { ...TESTIMONIALS[i], visible: true, order: i + 1 } });
    }
    console.log(`✓ ${TESTIMONIALS.length} testimoni dibuat`);
  } else {
    console.log("• Testimoni sudah ada, dilewati");
  }

  console.log("🌿 Seed selesai!");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
