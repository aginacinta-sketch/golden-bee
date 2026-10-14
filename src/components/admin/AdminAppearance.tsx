"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Info, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { UploadField } from "./UploadField";
import { FacebookIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from "../catalog/SocialLinks";
import { adminFetch, adminJson, jsonInit } from "@/lib/client";
import { ICON_OPTIONS } from "@/lib/icons";
import type { SettingsMap } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Kunci yang dapat diedit di tab Tampilan
const EDITABLE_KEYS = [
  "brandPrimary",
  "brandAccent",
  "headerColor",
  "accentColor",
  "supplierName",
  "supplierLogo",
  "supplierFlag",
  "supplierCountry",
  "supplierCountryCode",
  "supplierAddress",
  "supplierCategory",
  "supplierDesc",
  "verified",
  "showQr",
  "qrCustomUrl",
  "responseRate",
  "responseTime",
  "socialFacebook",
  "socialInstagram",
  "socialTiktok",
  "socialYoutube",
  "tags",
  "contactEmail",
  "contactPhone",
  "whatsapp",
  "aboutTitle",
  "aboutText",
  "expYears",
  "destCountries",
  "b2bCustomers",
  "mapEmbedUrl",
  "footerText",
  "showWhatsapp",
  "showTestimoni",
  "showTentang",
];

export function AdminAppearance({ settings, onSaved }: { settings: SettingsMap; onSaved: (s: SettingsMap) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<{ icon: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const f: Record<string, string> = {};
    for (const k of EDITABLE_KEYS) f[k] = settings[k] ?? "";
    setForm(f);
    try {
      const t = JSON.parse(settings.tags || "[]");
      setTags(Array.isArray(t) ? t : []);
    } catch {
      setTags([]);
    }
  }, [settings]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, tags: JSON.stringify(tags) };
      const res = await adminFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Gagal menyimpan pengaturan.");
      }
      const updated = (await res.json()) as SettingsMap;
      onSaved(updated);
      // Status sinkronisasi ke pusat data (khusus salinan website ter-deploy)
      const status = res.headers.get("x-sync-status") || "nonaktif";
      if (status === "terkirim") {
        toast({
          title: "Tersimpan & tersinkron!",
          description:
            "Perubahan sudah dikirim ke pusat data. Link QR & pengaturan akan tetap ada walau server publik di-reset platform.",
        });
      } else if (status === "antre") {
        toast({
          title: "Tersimpan (sinkronisasi tertunda)",
          description:
            "Perubahan tersimpan di server ini, tetapi gagal dikirim ke pusat data. Tekan Publish agar perubahan pasti permanen.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Tersimpan!", description: "Perubahan tampilan sudah diterapkan." });
      }
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleKey = (k: string) => ({
    checked: form[k] === "1",
    onCheckedChange: (v: boolean) => set(k, v ? "1" : "0"),
  });

  return (
    <div className="grid gap-5">
      {/* Identitas & Warna */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identitas Situs &amp; Warna</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nama Brand (kata pertama)</Label>
              <Input value={form.brandPrimary || ""} onChange={(e) => set("brandPrimary", e.target.value)} placeholder="cth. mitra" />
            </div>
            <div className="grid gap-2">
              <Label>Nama Brand (kata aksen)</Label>
              <Input value={form.brandAccent || ""} onChange={(e) => set("brandAccent", e.target.value)} placeholder="cth. dagang" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Warna Header</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.headerColor || "#0B3B2E"}
                  onChange={(e) => set("headerColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border"
                  aria-label="Pilih warna header"
                />
                <Input value={form.headerColor || ""} onChange={(e) => set("headerColor", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Warna Aksen (tombol)</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.accentColor || "#84BD00"}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border"
                  aria-label="Pilih warna aksen"
                />
                <Input value={form.accentColor || ""} onChange={(e) => set("accentColor", e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profil Supplier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil Pemasok</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nama Pemasok</Label>
            <Input value={form.supplierName || ""} onChange={(e) => set("supplierName", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Logo Pemasok</Label>
            <UploadField value={form.supplierLogo || ""} onChange={(v) => set("supplierLogo", v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label>Bendera (emoji)</Label>
              <Input value={form.supplierFlag || ""} onChange={(e) => set("supplierFlag", e.target.value)} placeholder="🇮🇩" />
            </div>
            <div className="grid gap-2">
              <Label>Kode Negara</Label>
              <Input value={form.supplierCountryCode || ""} onChange={(e) => set("supplierCountryCode", e.target.value)} placeholder="cth. ID" />
            </div>
            <div className="grid gap-2">
              <Label>Negara</Label>
              <Input value={form.supplierCountry || ""} onChange={(e) => set("supplierCountry", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Kategori (breadcrumb)</Label>
              <Input value={form.supplierCategory || ""} onChange={(e) => set("supplierCategory", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Alamat</Label>
            <Input value={form.supplierAddress || ""} onChange={(e) => set("supplierAddress", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Deskripsi Pemasok</Label>
            <Textarea rows={4} value={form.supplierDesc || ""} onChange={(e) => set("supplierDesc", e.target.value)} />
          </div>

          {/* Tag */}
          <div className="grid gap-2">
            <Label>Tag Pemasok (dengan ikon)</Label>
            <div className="grid gap-2">
              {tags.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={t.icon}
                    onValueChange={(v) => setTags((arr) => arr.map((x, j) => (j === i ? { ...x, icon: v } : x)))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Ikon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((ic) => (
                        <SelectItem key={ic} value={ic}>
                          {ic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={t.label}
                    onChange={(e) => setTags((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="cth. Distributor"
                  />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setTags((arr) => arr.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setTags((arr) => [...arr, { icon: "tag", label: "" }])}
            >
              <Plus className="h-4 w-4" /> Tambah Tag
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badge, QR & Statistik */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Badge, QR &amp; Statistik Profil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tingkat Respons</Label>
              <Input value={form.responseRate || ""} onChange={(e) => set("responseRate", e.target.value)} placeholder="cth. 98%" />
            </div>
            <div className="grid gap-2">
              <Label>Kecepatan Balas</Label>
              <Input value={form.responseTime || ""} onChange={(e) => set("responseTime", e.target.value)} placeholder="cth. &lt; 2 Jam" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sw-verified" className="cursor-pointer">Badge &ldquo;Terverifikasi&rdquo;</Label>
              <Switch id="sw-verified" {...toggleKey("verified")} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sw-qr" className="cursor-pointer">Kartu &amp; Pil QR Code</Label>
              <Switch id="sw-qr" {...toggleKey("showQr")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qr-custom-url">Link Kustom QR Code (opsional)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="qr-custom-url"
                className="flex-1"
                value={form.qrCustomUrl || ""}
                onChange={(e) => set("qrCustomUrl", e.target.value)}
                placeholder="https://wa.me/6281234567890 — atau link katalog, produk, website lain"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => set("qrCustomUrl", window.location.origin)}
                title="Isi kolom dengan alamat website ini"
              >
                <Globe className="h-4 w-4" /> Pakai Alamat Situs Ini
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Isi untuk membuat QR Code mengarah ke tautan pilihan Anda (mis. WhatsApp, katalog PDF, Google Maps, atau website lain). Klik <strong>Pakai Alamat Situs Ini</strong> agar QR langsung membuka alamat website ini — saat website dipindah ke domain lain, klik tombol ini lagi lalu simpan agar QR ikut berubah. Kosongkan untuk memakai tautan profil otomatis. Jika tautan menunjuk ke website ini sendiri, penanda mode publik ditambahkan otomatis sehingga pengunjung yang membuka dari hasil scan QR <strong>tidak melihat menu Admin</strong>.
            </p>
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <p className="flex items-start gap-2 font-semibold">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Cara kerja penyimpanan link QR:
              </p>
              <p className="mt-1">
                Website publik hasil <strong>Publish</strong> memakai salinan database sendiri yang bisa di-reset platform kapan saja. Sekarang setiap kali Anda menyimpan, perubahan <strong>otomatis dikirim ke pusat data</strong> dan saat server publik bangkit kembali, link QR terbaru <strong>ditarik otomatis</strong> — jadi tidak hilang lagi. Bila notifikasi sinkronisasi gagal (mis. situs utama sedang tidur), cukup tekan <strong>Publish</strong> sekali lagi agar perubahan dijahit permanen ke paket deployment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Sosial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media Sosial Profil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <FacebookIcon className="h-4 w-4" /> URL Facebook
              </Label>
              <Input
                value={form.socialFacebook || ""}
                onChange={(e) => set("socialFacebook", e.target.value)}
                placeholder="https://facebook.com/namapemasok"
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <InstagramIcon className="h-4 w-4" /> URL Instagram
              </Label>
              <Input
                value={form.socialInstagram || ""}
                onChange={(e) => set("socialInstagram", e.target.value)}
                placeholder="https://instagram.com/namapemasok"
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <TiktokIcon className="h-4 w-4" /> URL TikTok
              </Label>
              <Input
                value={form.socialTiktok || ""}
                onChange={(e) => set("socialTiktok", e.target.value)}
                placeholder="https://tiktok.com/@namapemasok"
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <YoutubeIcon className="h-4 w-4" /> URL YouTube
              </Label>
              <Input
                value={form.socialYoutube || ""}
                onChange={(e) => set("socialYoutube", e.target.value)}
                placeholder="https://youtube.com/@namapemasok"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Ikon berwarna tampil di banner profil, di bawah statistik &ldquo;Tingkat Respons / Kecepatan Balas&rdquo;. Kosongkan URL untuk menyembunyikan ikon terkait.
          </p>
        </CardContent>
      </Card>

      {/* Kontak */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Kontak</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Telepon</Label>
              <Input value={form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Nomor WhatsApp</Label>
              <Input value={form.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="6281234567890" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Konten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konten Halaman</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Judul Bagian Tentang</Label>
            <Input value={form.aboutTitle || ""} onChange={(e) => set("aboutTitle", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Isi Bagian Tentang</Label>
            <Textarea rows={5} value={form.aboutText || ""} onChange={(e) => set("aboutText", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Teks Footer</Label>
            <Textarea rows={2} value={form.footerText || ""} onChange={(e) => set("footerText", e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sw-wa" className="cursor-pointer">Tombol WhatsApp</Label>
              <Switch id="sw-wa" {...toggleKey("showWhatsapp")} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sw-testi" className="cursor-pointer">Bagian Testimoni</Label>
              <Switch id="sw-testi" {...toggleKey("showTestimoni")} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sw-tentang" className="cursor-pointer">Bagian Tentang</Label>
              <Switch id="sw-tentang" {...toggleKey("showTentang")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistik Tentang Kami */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistik &ldquo;Tentang Kami&rdquo;</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Tahun Pengalaman</Label>
              <Input
                value={form.expYears || ""}
                onChange={(e) => set("expYears", e.target.value)}
                placeholder="cth. 15+"
              />
            </div>
            <div className="grid gap-2">
              <Label>Negara Tujuan</Label>
              <Input
                value={form.destCountries || ""}
                onChange={(e) => set("destCountries", e.target.value)}
                placeholder="cth. 32"
              />
            </div>
            <div className="grid gap-2">
              <Label>Pelanggan B2B</Label>
              <Input
                value={form.b2bCustomers || ""}
                onChange={(e) => set("b2bCustomers", e.target.value)}
                placeholder="cth. 500+"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Tampil di bagian &ldquo;Tentang Kami&rdquo;, di bawah judul bagian. Kosongkan untuk menyembunyikan statistik terkait.
          </p>
        </CardContent>
      </Card>

      {/* Peta Lokasi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peta Lokasi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Link Peta (Share / Embed)</Label>
            <Input
              value={form.mapEmbedUrl || ""}
              onChange={(e) => set("mapEmbedUrl", e.target.value)}
              placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/place/..."
            />
          </div>
          <p className="text-xs text-slate-500">
            Tempel <strong>link share</strong> Google Maps (buka Google Maps → cari lokasi → Bagikan → Salin link, mis. https://maps.app.goo.gl/... atau https://www.google.com/maps/place/...) — link dikonversi otomatis agar tampil di situs. Link embed (src) juga didukung. Peta tampil kecil di bawah statistik &ldquo;Tentang Kami&rdquo;. Kosongkan untuk menyembunyikan peta.
          </p>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          size="lg"
          className="bg-[#0B3B2E] text-white shadow-lg hover:bg-[#0B3B2E]/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Perubahan Tampilan
        </Button>
      </div>
    </div>
  );
}
