"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Menu,
  X,
  Palette,
  Package,
  ListOrdered,
  Star,
  Images,
  Inbox,
  MessagesSquare,
  KeyRound,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { AdminAppearance } from "./AdminAppearance";
import { AdminProducts } from "./AdminProducts";
import { AdminMenus } from "./AdminMenus";
import { AdminTestimonials } from "./AdminTestimonials";
import { AdminMedia } from "./AdminMedia";
import { AdminMessages } from "./AdminMessages";
import { AdminChatPanel } from "@/components/chat/AdminChatPanel";
import { AdminAccount } from "./AdminAccount";
import { adminFetch, clearToken, getToken, setToken } from "@/lib/client";
import { applyThemeVars } from "@/lib/themeVars";
import type { ContactRequest, SettingsMap } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { RfqSheet } from "./RfqSheet";

const MENU_TRIGGER =
  "h-auto min-h-11 w-full justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-300 data-[state=active]:bg-[var(--bp-accent,#84BD00)] data-[state=active]:font-semibold data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm lg:justify-start lg:gap-2.5 lg:px-3 lg:py-2.5 lg:text-sm";

export function AdminPanel() {
  const { toast } = useToast();
  // Panel admin hanya dirender di sisi klien, jadi lazy init dari localStorage aman.
  const [authed, setAuthed] = useState<boolean>(() => typeof window !== "undefined" && !!getToken());
  // Setelan diinisialisasi dari cache aksen terakhir (localStorage) agar warna
  // merek langsung dipakai sejak render pertama — tanpa ini menu aktif dulu
  // berwarna hijau fallback #84BD00 lalu berubah ke warna merek setelah
  // /api/settings selesai = kedipan hijau kecil setiap kali masuk panel.
  const [settings, setSettings] = useState<SettingsMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const cache = window.localStorage.getItem("bp-setelan-aksen");
      return cache ? (JSON.parse(cache) as SettingsMap) : {};
    } catch {
      return {};
    }
  });
  // Tab aktif dikendalikan agar kartu dashboard dapat berpindah menu (pesan/produk/dsb.).
  const [tab, setTab] = useState("dashboard");
  // Menu navigasi mobile: terbuka/tutup lewat tombol hamburger (lg: selalu tampil sbg sidebar).
  const [menuBuka, setMenuBuka] = useState(false);
  const pindahTab = useCallback((v: string) => {
    setTab(v);
    setMenuBuka(false);
  }, []);
  // Pesan yang lembar RFQ-nya sedang dicetak (dirender di luar wrapper — pola isolasi cetak).
  const [rfqFor, setRfqFor] = useState<ContactRequest | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminFetch("/api/settings");
      if (res.ok) {
        const data = (await res.json()) as SettingsMap;
        setSettings(data);
        // Simpan aksen untuk paint instan pada kunjungan berikutnya (anti kedip).
        try {
          window.localStorage.setItem(
            "bp-setelan-aksen",
            JSON.stringify({ accentColor: data.accentColor, headerColor: data.headerColor }),
          );
        } catch {
          // penyimpanan penuh/ditolak — abaikan, fallback tetap berjalan
        }
      }
    } catch {
      // abaikan
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    // Muat pengaturan saat sesi admin aktif (setState terjadi dalam callback async,
    // bukan sinkron di body effect — aman dari cascading render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [authed, loadSettings]);

  const handleLogin = (token: string) => {
    setToken(token);
    setAuthed(true);
    loadSettings();
  };

  const handleLogout = async () => {
    try {
      await adminFetch("/api/admin/login", { method: "DELETE" });
    } catch {
      // abaikan
    }
    clearToken();
    setAuthed(false);
    toast({ title: "Anda telah keluar." });
  };

  const goWebsite = () => {
    window.location.hash = "";
    window.scrollTo({ top: 0 });
  };

  // Sinkronkan tema ke :root agar Dialog/portal admin ikut mewarisi warna
  // (dipanggil sebelum early return — aturan hooks)
  const accent = settings.accentColor || "#84BD00";
  const headerColor = settings.headerColor || "";
  useEffect(() => {
    applyThemeVars({ accent, header: headerColor || undefined });
  }, [accent, headerColor]);

  // Alur cetak Lembar RFQ: tunggu gambar/layout 400ms -> window.print() ->
  // reset via afterprint + cadangan timeout 250ms (pola sama dengan cetak katalog).
  useEffect(() => {
    if (!rfqFor) return;
    let cancelled = false;
    const done = () => {
      if (!cancelled) setRfqFor(null);
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
  }, [rfqFor]);

  if (!authed) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const themeStyle = {
    "--bp-accent": accent,
  } as React.CSSProperties;

  return (
    <>
      <div style={themeStyle} className={`min-h-screen bg-slate-100 ${rfqFor ? "print:hidden" : ""}`}>
        <Tabs value={tab} onValueChange={pindahTab} className="min-h-screen w-full flex-col gap-0 lg:flex-row">
        {/* Sidebar */}
        <aside className="sticky top-0 z-40 flex w-full shrink-0 self-start flex-col border-b border-neutral-200 bg-white text-neutral-900 shadow-sm lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
          {/* Bar brand — ringkas & tetap menempel saat digulir (mobile) */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 lg:gap-2.5 lg:px-5 lg:py-4">
            {/* Hamburger: buka/tutup menu navigasi (khusus mobile) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
              onClick={() => setMenuBuka((v) => !v)}
              aria-expanded={menuBuka}
              aria-controls="menu-navigasi-admin"
              aria-label={menuBuka ? "Tutup menu navigasi" : "Buka menu navigasi"}
            >
              {menuBuka ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bp-accent,#84BD00)] text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold text-neutral-900">Panel Admin</p>
              <p className="truncate text-xs text-neutral-500">Katalog Supplier B2B</p>
            </div>
            {/* Aksi cepat (mobile) */}
            <div className="flex shrink-0 items-center gap-0.5 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                onClick={goWebsite}
                aria-label="Lihat website"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                onClick={handleLogout}
                aria-label="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Menu navigasi — mobile: grid 3 kolom rapi (buka via hamburger), desktop: sidebar vertikal */}
          <TabsList
            id="menu-navigasi-admin"
            className={cn(
              "h-auto w-full grid-cols-2 gap-1.5 rounded-none border-t border-neutral-100 bg-transparent p-2.5 min-[360px]:grid-cols-3 lg:grid lg:grid-cols-1 lg:gap-1 lg:border-t-0 lg:p-3",
              menuBuka ? "grid!" : "hidden"
            )}
          >
            <TabsTrigger value="dashboard" className={MENU_TRIGGER}>
              <LayoutDashboard className="h-4 w-4" /> <span className="min-w-0 truncate">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="tampilan" className={MENU_TRIGGER}>
              <Palette className="h-4 w-4" /> <span className="min-w-0 truncate">Tampilan</span>
            </TabsTrigger>
            <TabsTrigger value="produk" className={MENU_TRIGGER}>
              <Package className="h-4 w-4" /> <span className="min-w-0 truncate">Produk</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className={MENU_TRIGGER}>
              <ListOrdered className="h-4 w-4" /> <span className="min-w-0 truncate">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="testimoni" className={MENU_TRIGGER}>
              <Star className="h-4 w-4" /> <span className="min-w-0 truncate">Testimoni</span>
            </TabsTrigger>
            <TabsTrigger value="media" className={MENU_TRIGGER}>
              <Images className="h-4 w-4" /> <span className="min-w-0 truncate">Media</span>
            </TabsTrigger>
            <TabsTrigger value="pesan" className={MENU_TRIGGER}>
              <Inbox className="h-4 w-4" /> <span className="min-w-0 truncate">Pesan</span>
            </TabsTrigger>
            <TabsTrigger value="livechat" className={MENU_TRIGGER}>
              <MessagesSquare className="h-4 w-4" /> <span className="min-w-0 truncate">Live Chat</span>
            </TabsTrigger>
            <TabsTrigger value="akun" className={MENU_TRIGGER}>
              <KeyRound className="h-4 w-4" /> <span className="min-w-0 truncate">Akun</span>
            </TabsTrigger>
          </TabsList>

          {/* Aksi bawah (desktop) */}
          <div className="mt-auto hidden space-y-1 border-t border-neutral-200 p-3 lg:block">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={goWebsite}
            >
              <ExternalLink className="h-4 w-4" /> Lihat Website
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </aside>

        {/* Konten */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <TabsContent value="dashboard">
              <AdminDashboard settings={settings} onNavigate={pindahTab} />
            </TabsContent>
            <TabsContent value="tampilan">
              <AdminAppearance settings={settings} onSaved={setSettings} />
            </TabsContent>
            <TabsContent value="produk">
              <AdminProducts onChanged={loadSettings} />
            </TabsContent>
            <TabsContent value="menu">
              <AdminMenus onChanged={loadSettings} />
            </TabsContent>
            <TabsContent value="testimoni">
              <AdminTestimonials onChanged={loadSettings} />
            </TabsContent>
            <TabsContent value="media">
              <AdminMedia />
            </TabsContent>
            <TabsContent value="pesan">
              <AdminMessages settings={settings} onCetak={(m) => setRfqFor(m)} />
            </TabsContent>
            <TabsContent value="livechat">
              <AdminChatPanel variant="panel" />
            </TabsContent>
            <TabsContent value="akun">
              <AdminAccount onLogout={handleLogout} />
            </TabsContent>
          </div>
        </main>
      </Tabs>
      </div>

      {/* Lembar RFQ versi cetak — dirender di luar wrapper (hanya tampil saat mencetak) */}
      {rfqFor && (
        <div className="hidden print:block">
          <RfqSheet request={rfqFor} settings={settings} />
        </div>
      )}
    </>
  );
}
