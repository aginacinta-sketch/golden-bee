"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "./Header";
import { SupplierHero } from "./SupplierHero";
import { ProductGrid } from "./ProductGrid";
import { AboutSection, CtaStrip, TestimonialsSection } from "./Sections";
import { SiteFooter } from "./SiteFooter";
import { ContactDialog, type ContactPrefill } from "./ContactDialog";
import { VideoDialog } from "./VideoDialog";
import { ProductDetailDialog, ProductPrintSheet } from "./ProductDetailDialog";
import { CatalogPrintSheet } from "./CatalogPrintSheet";
import { ChatWidget } from "./ChatWidget";
import { apiJson } from "@/lib/client";
import { applyThemeVars } from "@/lib/themeVars";
import type { MenuItem, Product, SettingsMap, Testimonial } from "@/lib/types";

export function CatalogSite() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  // Gagal memuat data dari server (mis. gangguan database) — ditampilkan
  // sebagai layar error + tombol coba lagi, BUKAN spinner tanpa batas waktu
  // (kasus lampau: server produksi bermasalah → pengguna hanya melihat
  // "Memuat katalog…" selamanya tanpa tahu ada yang salah).
  const [loading, setLoading] = useState(true);
  const [gagalMuat, setGagalMuat] = useState(false);

  const [search, setSearch] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactPrefill, setContactPrefill] = useState<ContactPrefill>({});
  const [videoSrc, setVideoSrc] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [printCatalog, setPrintCatalog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, m, t] = await Promise.all([
        apiJson<SettingsMap>("/api/settings"),
        apiJson<Product[]>("/api/products"),
        apiJson<MenuItem[]>("/api/menus"),
        apiJson<Testimonial[]>("/api/testimonials"),
      ]);
      setSettings(s);
      setProducts(p);
      setMenus(m);
      setTestimonials(t);
      setGagalMuat(false);
    } catch {
      // Tandai gagal — layar spinner diganti pesan error + tombol coba lagi
      setGagalMuat(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sinkronkan tema ke :root agar Dialog/portal di luar wrapper ikut mewarisi warna
  useEffect(() => {
    if (!settings) return;
    applyThemeVars({
      accent: settings.accentColor || "#84BD00",
      header: settings.headerColor || "#0B3B2E",
    });
  }, [settings]);

  // Alur cetak katalog: render lembar katalog -> beri waktu gambar termuat ->
  // buka dialog cetak browser (pilih "Simpan sebagai PDF" untuk mengunduh).
  useEffect(() => {
    if (!printCatalog) return;
    let cancelled = false;
    const done = () => {
      if (!cancelled) setPrintCatalog(false);
    };
    window.addEventListener("afterprint", done);
    const t = window.setTimeout(() => {
      window.print();
      // Cadangan bila event afterprint tidak terpanggil
      window.setTimeout(done, 250);
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printCatalog]);

  const navigate = useCallback((target: string) => {
    if (target === "#beranda") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // selector tidak valid, abaikan
    }
  }, []);

  const openContact = useCallback((prefill?: ContactPrefill) => {
    setContactPrefill(prefill || {});
    setContactOpen(true);
  }, []);

  if (!settings) {
    return (
      // data-app-root: penanda akar katalog — dipakai CSS boot-admin
      // (globals.css) untuk menyembunyikan layar ini saat boot panel admin
      // agar spinner hijau tidak sempat tampak (kedipan hijau).
      <div data-app-root className="flex min-h-screen items-center justify-center bg-slate-50">
        {gagalMuat ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-8 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl" aria-hidden="true">
              ⚠️
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">Gagal memuat katalog</p>
              <p className="mt-1 text-sm text-slate-500">
                Server sedang tidak merespons dengan benar. Coba beberapa saat lagi.
              </p>
            </div>
            <button
              onClick={() => {
                setGagalMuat(false);
                loadData();
              }}
              className="rounded-lg bg-[#84BD00] px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#74a400] active:scale-[0.98]"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#84BD00] border-t-transparent" />
            <p className="text-sm text-slate-500">Memuat katalog…</p>
          </div>
        )}
      </div>
    );
  }

  const themeStyle = {
    "--bp-header": settings.headerColor || "#0B3B2E",
    "--bp-accent": settings.accentColor || "#84BD00",
  } as React.CSSProperties;

  return (
    <>
      <div
        data-app-root
        style={themeStyle}
        className={`flex min-h-screen flex-col bg-white ${detailProduct || printCatalog ? "print:hidden" : ""}`}
      >
      <Header
        settings={settings}
        menus={menus}
        onContact={() => openContact()}
        onNavigate={navigate}
      />

      <main className="flex-1">
        <SupplierHero settings={settings} onContact={() => openContact()} />

        <ProductGrid
          products={products}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          onContact={(p) =>
            openContact({
              productId: p.id,
              productName: p.name,
              category: p.category,
              image: p.images?.[0] || "",
              priceMin: p.priceMin,
              priceMax: p.priceMax,
              unit: p.unit,
              minOrder: p.minOrder,
            })
          }
          onPlayVideo={(p) => setVideoSrc(p)}
          onOpenDetail={(p) => setDetailProduct(p)}
          onPrintCatalog={() => setPrintCatalog(true)}
        />

        {settings.showTentang === "1" && <AboutSection settings={settings} />}

        {settings.showTestimoni === "1" && <TestimonialsSection testimonials={testimonials} />}

        <CtaStrip onContact={() => openContact()} />
      </main>

      <SiteFooter settings={settings} menus={menus} onNavigate={navigate} />

      <ContactDialog
        open={contactOpen}
        prefill={contactPrefill}
        supplierName={settings.supplierName}
        whatsapp={settings.whatsapp}
        onClose={() => setContactOpen(false)}
      />

      <VideoDialog
        src={videoSrc?.video || null}
        title={videoSrc?.name}
        onClose={() => setVideoSrc(null)}
      />

      <ProductDetailDialog
        product={detailProduct}
        settings={settings}
        onClose={() => setDetailProduct(null)}
      />

      {/* Live chat mengambang — mode pengunjung & mode admin otomatis */}
      {settings && <ChatWidget supplierName={settings.supplierName || "Supplier"} />}
      </div>

      {/* Lembar cetak PDF — di luar wrapper aplikasi agar terlihat saat print */}
      {detailProduct && <ProductPrintSheet product={detailProduct} settings={settings} />}
      {printCatalog && <CatalogPrintSheet products={products} settings={settings} />}
    </>
  );
}
