"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, FileDown, FileSpreadsheet, FileText, Inbox, Loader2, PackageSearch, Phone, Printer, Trash2 } from "lucide-react";
import { adminFetch, adminJson, jsonInit } from "@/lib/client";
import { formatHarga } from "@/lib/format";
import { RfqSheet } from "./RfqSheet";
import type { ContactRequest, Product, SettingsMap } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  baru: { label: "Baru", className: "bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent)]" },
  dibaca: { label: "Dibaca", className: "bg-slate-200 text-slate-700 hover:bg-slate-200" },
  selesai: { label: "Selesai", className: "bg-green-100 text-green-700 hover:bg-green-100" },
};

/** Ikon WhatsApp (glyph simple-icons) — lucide tidak menyediakan ikon WhatsApp. */
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/** Normalisasi nomor telepon pengirim ke format wa.me (62xxx). */
function waPhone(raw: string): string {
  let d = (raw || "").replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

interface Props {
  settings: SettingsMap;
  /** Minta AdminPanel mencetak lembar RFQ untuk pesan ini (render lembar versi cetak di luar wrapper). */
  onCetak: (m: ContactRequest) => void;
}

export function AdminMessages({ settings, onCetak }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [viewing, setViewing] = useState<ContactRequest | null>(null);
  const [deleting, setDeleting] = useState<ContactRequest | null>(null);
  const [rfqPreview, setRfqPreview] = useState<ContactRequest | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminJson<ContactRequest[]>(`/api/admin/contacts?status=${filter}`));
    } catch (e) {
      toast({ title: "Gagal memuat pesan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

  }, [filter]);

  useEffect(() => {
    // Muat katalog produk (API publik) untuk gambar & harga produk terkait pesan.
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? (d as Product[]) : []))
      .catch(() => {});
  }, []);

  const setStatus = async (m: ContactRequest, status: string) => {
    try {
      await adminJson(`/api/admin/contacts/${m.id}`, jsonInit("PUT", { status }));
      await load();
    } catch (e) {
      toast({ title: "Gagal memperbarui status", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  /** Unduh laporan seluruh pesan masuk (detail & rinci) sebagai PDF atau XLSX. */
  const downloadReport = async (fmt: "pdf" | "xlsx") => {
    setExporting(fmt);
    try {
      const res = await adminFetch(`/api/admin/contacts/export/${fmt}`);
      if (!res.ok) {
        let msg = "Terjadi kesalahan pada server.";
        try {
          const j = await res.json();
          if (typeof j?.error === "string") msg = j.error;
        } catch {
          /* respons bukan JSON */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      a.href = url;
      a.download = `laporan-pesan-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: fmt === "pdf" ? "Laporan PDF berhasil diunduh" : "Laporan XLSX berhasil diunduh",
        description: `${items.length} pesan diekspor lengkap dengan seluruh rinciannya.`,
      });
    } catch (e) {
      toast({ title: "Gagal mengekspor laporan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const view = async (m: ContactRequest) => {
    setViewing(m);
    setRfqPreview(null);
    if (m.status === "baru") {
      await setStatus(m, "dibaca");
    }
  };

  const remove = async (m: ContactRequest) => {
    try {
      await adminJson(`/api/admin/contacts/${m.id}`, { method: "DELETE" });
      toast({ title: "Pesan dihapus" });
      setDeleting(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  // ---------- Derived data untuk dialog detail ----------
  const supplierName = settings.supplierName || "Supplier";

  const findProduct = (m: ContactRequest): Product | undefined =>
    products.find((p) => p.id && p.id === m.productId) ||
    products.find((p) => !!m.productName && p.name === m.productName) ||
    products.find((p) => !!m.productName && p.name.toLowerCase().includes(m.productName.toLowerCase()));

  const waHref = (m: ContactRequest, text: string) =>
    `https://wa.me/${waPhone(m.phone)}?text=${encodeURIComponent(text)}`;

  const quickText = (m: ContactRequest) =>
    `Halo ${m.name}, terima kasih telah menghubungi ${supplierName}. Menanggapi pesan Anda${m.productName ? ` tentang produk ${m.productName}` : ""}, ada yang bisa kami bantu lebih lanjut?`;

  const rel = viewing ? findProduct(viewing) : undefined;
  const hargaRel = rel ? formatHarga(rel.priceMin, rel.priceMax, rel.unit) : "";
  const hasPhone = viewing ? !!waPhone(viewing.phone) : false;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Permintaan kontak dari pengunjung website.{" "}
          {items.filter((i) => i.status === "baru").length > 0 && (
            <span className="font-semibold text-[var(--bp-accent-dark)]">
              {items.filter((i) => i.status === "baru").length} pesan baru.
            </span>
          )}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="w-full justify-center sm:w-auto"
            onClick={() => downloadReport("pdf")}
            disabled={exporting !== null}
            title="Unduh laporan seluruh pesan masuk (PDF)"
          >
            {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Ekspor PDF
          </Button>
          <Button
            variant="outline"
            className="w-full justify-center sm:w-auto"
            onClick={() => downloadReport("xlsx")}
            disabled={exporting !== null}
            title="Unduh laporan seluruh pesan masuk (Excel)"
          >
            {exporting === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Ekspor XLSX
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Status</SelectItem>
              <SelectItem value="baru">Baru</SelectItem>
              <SelectItem value="dibaca">Dibaca</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Belum ada permintaan kontak masuk.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((m) => {
            const st = STATUS_STYLE[m.status] || STATUS_STYLE.baru;
            return (
              <Card key={m.id} className={m.status === "baru" ? "border-[var(--bp-accent)]" : ""}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">{m.name}</p>
                      <Badge className={st.className}>{st.label}</Badge>
                      {m.productName && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--bp-accent-soft)] px-1.5 py-0.5 text-xs text-[var(--bp-accent-dark)]">
                          <PackageSearch className="h-3 w-3" />
                          {m.productName}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {fmtDate(m.createdAt)} · {m.email} {m.company && `· ${m.company}`}
                      {m.quantity && ` · Kebutuhan: ${m.quantity} ${m.unit || ""}`.trimEnd()}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{m.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Select value={m.status} onValueChange={(v) => setStatus(m, v)}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="dibaca">Dibaca</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => view(m)} aria-label="Lihat detail pesan" title="Lihat detail pesan">
                      <Eye className="h-4 w-4" /> Lihat
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(m)} aria-label="Hapus pesan">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog baca pesan */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pesan dari {viewing?.name}</DialogTitle>
            <DialogDescription>
              {viewing && fmtDate(viewing.createdAt)}
              {viewing?.productName && ` · Produk: ${viewing.productName}`}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-3 text-sm">
              {/* Produk terkait + gambar */}
              {rel ? (
                <div className="flex items-center gap-3 rounded-lg border p-2.5">
                  {rel.images?.[0] ? (
                    <img
                      src={rel.images[0]}
                      alt={`Gambar produk ${rel.name}`}
                      className="h-14 w-14 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <PackageSearch className="h-5 w-5 text-slate-300" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Produk Diminta</p>
                    <p className="truncate font-semibold text-slate-800">{rel.name}</p>
                    {hargaRel && <p className="font-bold text-[var(--bp-accent-dark)]">{hargaRel}</p>}
                    {rel.minOrder && (
                      <p className="text-xs text-slate-400">Min. pesanan: {rel.minOrder} {rel.unit}</p>
                    )}
                  </div>
                </div>
              ) : viewing.productName ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-slate-500">
                  <PackageSearch className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>Produk “{viewing.productName}” tidak ditemukan di katalog.</span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <a href={`mailto:${viewing.email}`} className="break-all font-medium text-[var(--bp-accent-dark)] hover:underline">
                    {viewing.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Telepon</p>
                  <p className="flex items-center gap-1 font-medium">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {viewing.phone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Perusahaan</p>
                  <p className="font-medium">{viewing.company || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Subjek</p>
                  <p className="font-medium">{viewing.subject || "-"}</p>
                </div>
                {viewing.quantity && (
                  <div>
                    <p className="text-xs text-slate-400">Estimasi Kebutuhan</p>
                    <p className="font-medium">
                      {viewing.quantity} {viewing.unit}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-400">Isi Pesan</p>
                <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700">{viewing.message}</p>
              </div>

              {/* Aksi balas: WhatsApp & Buat Permintaan */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  className={`flex-1 bg-[#25D366] text-white hover:bg-[#1fb857] ${hasPhone ? "" : "pointer-events-none opacity-50"}`}
                  title={hasPhone ? "Balas pesan ini via WhatsApp" : "Nomor telepon pengirim tidak tersedia"}
                >
                  <a
                    href={hasPhone ? waHref(viewing, quickText(viewing)) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!hasPhone}
                  >
                    <WaIcon className="h-4 w-4" /> Chat WhatsApp
                  </a>
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setRfqPreview(viewing)}>
                  <FileText className="h-4 w-4" /> Buat Permintaan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog pratinjau Lembar Permintaan Penawaran Resmi ( disembunyikan saat cetak — lembar versi cetak dirender terpisah) */}
      <Dialog open={!!rfqPreview} onOpenChange={(v) => !v && setRfqPreview(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl print:hidden">
          <DialogHeader>
            <DialogTitle>Lembar Permintaan Penawaran Resmi</DialogTitle>
            <DialogDescription>
              Pratinjau dokumen RFQ untuk pesan dari {rfqPreview?.name}. Klik "Cetak Sekarang" untuk mencetak atau menyimpan sebagai PDF.
            </DialogDescription>
          </DialogHeader>
          {rfqPreview && (
            <div className="grid gap-3">
              <div className="max-h-[55vh] overflow-y-auto rounded-lg border bg-white nice-scroll">
                <RfqSheet request={rfqPreview} settings={settings} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={() => {
                    // Tutup semua dialog (pratinjau + detail) agar tidak ikut tercetak,
                    // lalu minta AdminPanel merender lembar versi cetak di luar wrapper.
                    setRfqPreview(null);
                    setViewing(null);
                    onCetak(rfqPreview);
                  }}
                >
                  <Printer className="h-4 w-4" /> Cetak Sekarang
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setRfqPreview(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pesan ini?</AlertDialogTitle>
            <AlertDialogDescription>Pesan dari “{deleting?.name}” akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleting && remove(deleting)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
