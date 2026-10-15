import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

import { getPublicSettings } from "@/lib/admin";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getPublicSettings();
    const namaPemasok = s.supplierName?.trim() || "MitraDagang";
    const desc =
      s.supplierDesc?.trim() ||
      s.footerText?.trim() ||
      `Katalog resmi produk ${namaPemasok}.`;
    return {
      title: namaPemasok,
      description: desc,
      keywords: ["katalog supplier", "B2B", "pemasok", namaPemasok],
      openGraph: {
        title: namaPemasok,
        description: desc,
        siteName: namaPemasok,
        type: "website",
      },
    };
  } catch {
    return {
      title: "MitraDagang — Katalog Supplier B2B",
      description: "Katalog supplier B2B Indonesia",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
