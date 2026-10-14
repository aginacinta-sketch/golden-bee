import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MitraDagang — Katalog Supplier B2B Indonesia",
  description:
    "Katalog supplier B2B lengkap: temukan produk supplier terpercaya, cari produk, dan kirim permintaan kontak langsung ke pemasok.",
  keywords: ["katalog supplier", "B2B", "pemasok", "distributor", "grosir", "ekspor Indonesia"],
  authors: [{ name: "MitraDagang" }],
  openGraph: {
    title: "MitraDagang — Katalog Supplier B2B",
    description: "Temukan produk supplier terpercaya dan kirim permintaan kontak langsung.",
    siteName: "MitraDagang",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Anti-kedip hijau saat membuka panel admin: sebelum React hidup,
            tandai <html> dengan kelas boot-admin bila URL membawa hash #admin
            (bukan mode publik QR). CSS globals.css memakai kelas ini untuk
            menyembunyikan render awal katalog (spinner hijau "Memuat katalog…")
            dan menampilkan layar netral sampai keputusan view selesai — kelas
            dilepas oleh src/app/page.tsx begitu pemeriksaan sesi berakhir. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var h=location.hash||'';var qr=/[?&]via=qr/i.test(location.search||'');if(!qr&&h.lastIndexOf('#admin',0)===0){document.documentElement.classList.add('boot-admin');}}catch(e){}})();",
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
