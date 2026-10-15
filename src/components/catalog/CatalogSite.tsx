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
import { ChatWidget } from "@/components/chat/ChatWidget";
import { apiJson } from "@/lib/client";
import { applyThemeVars } from "@/lib/themeVars";
import type { MenuItem, Product, SettingsMap, Testimonial } from "@/lib/types";
import { FALLBACK_SETTINGS, FALLBACK_MENUS, FALLBACK_PRODUCTS } from "@/lib/constants";
import { getCachedSettings, saveCachedSettings } from "@/lib/settingsCache";

interface CatalogSiteProps {
  initialSettings?: SettingsMap;
  onSettingsLoaded?: (settings: SettingsMap) => void;
}

export function CatalogSite({ initialSettings, onSettingsLoaded }: CatalogSiteProps = {}) {
  const [settings, setSettings] = useState<SettingsMap>(initialSettings || FALLBACK_SETTINGS);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [menus, setMenus] = useState<MenuItem[]>(FALLBACK_MENUS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
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
      saveCachedSettings(s);
      onSettingsLoaded?.(s);
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
  }, [onSettingsLoaded]);

  useEffect(() => {
    // Di peramban setelah hidrasi selesai: perbarui dari cache jika ada
    const cached = getCachedSettings();
    if (cached) {
      setSettings((prev) => ({ ...prev, ...cached }));
    }
  }, []);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

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

  // Sinkronkan nama pada tab browser mengikuti nama pemasok
  useEffect(() => {
    if (typeof document === "undefined") return;
    const namaPemasok = settings?.supplierName?.trim();
    if (namaPemasok) {
      document.title = namaPemasok;
    }
  }, [settings?.supplierName]);

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


  const themeStyle = {
    "--bp-header": settings.headerColor || "#b1ab06",
    "--bp-accent": settings.accentColor || "#b1ab06",
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
