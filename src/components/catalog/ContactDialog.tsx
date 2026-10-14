"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiJson } from "@/lib/client";
import { formatHarga, kapital } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export interface ContactPrefill {
  productId?: string;
  productName?: string;
  category?: string;
  subject?: string;
  image?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  unit?: string;
  minOrder?: string;
}

interface Props {
  open: boolean;
  prefill?: ContactPrefill;
  supplierName: string;
  whatsapp?: string;
  onClose: () => void;
}

const UNIT_OPTIONS = ["Kg", "Gram", "Ton", "Liter", "Karton", "Bal", "Kontainer", "Unit"];

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  quantity: string;
  unit: string;
  message: string;
}

export function ContactDialog({ open, prefill, supplierName, whatsapp, onClose }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({
    name: "",
    company: "",
    email: "",
    phone: "",
    quantity: "",
    unit: "Kg",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Nama produk yang tampil (format sama dengan kartu katalog: nama - kategori)
  const displayName = useMemo(() => {
    if (!prefill?.productName) return "";
    return prefill.category ? `${prefill.productName} - ${prefill.category}` : prefill.productName;
  }, [prefill]);

  // Baris harga estimasi: "Rp 115.000 - Rp 145.000 / Kg"
  const priceLine = useMemo(
    () => formatHarga(prefill?.priceMin ?? null, prefill?.priceMax ?? null, prefill?.unit),
    [prefill]
  );

  // Baris pesanan minimum: "250 Kg"
  const minOrderLine = useMemo(() => {
    if (!prefill?.minOrder) return "";
    return prefill.unit ? `${prefill.minOrder} ${kapital(prefill.unit)}` : prefill.minOrder;
  }, [prefill]);

  // Pilihan satuan: selalu sertakan satuan produk jika tidak ada di daftar umum
  const unitOptions = useMemo(() => {
    const base = [...UNIT_OPTIONS];
    const u = kapital(prefill?.unit || "");
    if (u && !base.some((o) => o.toLowerCase() === u.toLowerCase())) base.unshift(u);
    return base;
  }, [prefill]);

  // Pesan awal (template) sesuai gambar contoh
  const defaultMsg = useMemo(() => {
    if (prefill?.productName) {
      return `Halo ${supplierName}, kami berminat untuk melakukan pengadaan produk "${displayName}". Mohon informasi ketersediaan stok, harga penawaran resmi, serta syarat pengiriman.`;
    }
    return `Halo ${supplierName}, saya ingin menanyakan ketersediaan produk serta harga penawaran resmi dari perusahaan Anda. Mohon informasinya. Terima kasih.`;
  }, [prefill, supplierName, displayName]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      quantity: "",
      unit: kapital(prefill?.unit || "") || "Kg",
      message: defaultMsg,
    });
  }, [open, prefill, defaultMsg]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiJson("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          quantity: form.quantity,
          unit: form.unit,
          message: form.message,
          subject:
            prefill?.subject ||
            (prefill?.productName ? `Permintaan penawaran: ${prefill.productName}` : "Permintaan kontak"),
          productId: prefill?.productId || "",
          productName: prefill?.productName || "",
        }),
      });
      toast({
        title: "Permintaan terkirim!",
        description: `Terima kasih, ${form.name}. ${supplierName} akan menghubungi Anda segera.`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Tautan chat WhatsApp produk
  const waHref = useMemo(() => {
    if (!whatsapp) return "";
    const num = whatsapp.replace(/[^0-9]/g, "");
    const text = prefill?.productName
      ? `Halo ${supplierName}, saya tertarik dengan produk "${displayName}" di katalog Anda. Mohon info harga terbaik, ketersediaan stok, dan syarat pemesanan. Terima kasih.`
      : `Halo ${supplierName}, saya menemukan katalog B2B Anda dan ingin berdiskusi lebih lanjut tentang produk unggulan Anda. Terima kasih.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }, [whatsapp, prefill, supplierName, displayName]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {/* Header hijau — sesuai gambar contoh */}
        <div className="flex items-start gap-3 bg-[var(--bp-accent)] px-5 py-4 text-white">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/50 bg-white/10"
            aria-hidden="true"
          >
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg font-bold leading-tight text-white">
              Hubungi Pemasok / Minta Penawaran
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-white/85">
              Pesan langsung dikirimkan ke{" "}
              <span className="font-semibold text-white">{supplierName}</span>
            </DialogDescription>
          </div>
          <DialogClose
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/90 transition hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Tutup dialog"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Tutup</span>
          </DialogClose>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          {/* Bagian yang dapat digulir */}
          <div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-4 px-5 py-4">
              {/* Kartu produk yang diminati */}
              {prefill?.productName && (
                <div className="rounded-lg border border-[var(--bp-accent)]/40 bg-[var(--bp-accent-soft)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--bp-accent-dark)]">
                    Produk yang diminati:
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--bp-accent)]/30 bg-white">
                      {prefill.image ? (
                        <img
                          src={prefill.image}
                          alt={`Foto produk ${displayName}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-slate-300" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold leading-snug text-slate-900">{displayName}</p>
                      {(priceLine || minOrderLine) && (
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
                          {priceLine && (
                            <span>
                              Est. Harga: <span className="font-semibold text-slate-800">{priceLine}</span>
                            </span>
                          )}
                          {minOrderLine && (
                            <span>
                              Min. Order: <span className="font-semibold text-slate-800">{minOrderLine}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Baris 1: nama & perusahaan */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-nama">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ct-nama"
                    required
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-perusahaan">Nama Perusahaan / Bisnis</Label>
                  <Input
                    id="ct-perusahaan"
                    value={form.company}
                    onChange={set("company")}
                    placeholder="Contoh: PT Sumber Pangan Makmur"
                  />
                </div>
              </div>

              {/* Baris 2: email & WhatsApp */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-email">
                    Email Bisnis <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ct-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    placeholder="nama@perusahaan.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-telp">
                    Nomor WhatsApp / Telepon <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ct-telp"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+62 812-xxxx-xxxx"
                  />
                </div>
              </div>

              {/* Baris 3: estimasi jumlah & satuan */}
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-jumlah">Estimasi Jumlah Kebutuhan (Opsional)</Label>
                  <Input
                    id="ct-jumlah"
                    value={form.quantity}
                    onChange={set("quantity")}
                    placeholder="Contoh: 500 atau 2"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-satuan">Satuan</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                    <SelectTrigger id="ct-satuan" className="w-full" aria-label="Satuan">
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pesan */}
              <div className="grid gap-1.5">
                <Label htmlFor="ct-pesan">
                  Pesan / Rincian Kebutuhan Spesifik <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="ct-pesan"
                  required
                  rows={4}
                  value={form.message}
                  onChange={set("message")}
                  placeholder="Jelaskan kebutuhan Anda: jenis produk, jumlah, tujuan pengiriman, dll."
                />
              </div>

              {/* Catatan keamanan */}
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--bp-accent-dark)]" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-slate-600">
                  Data kontak Anda aman dan hanya diteruskan langsung kepada perwakilan resmi{" "}
                  <span className="font-semibold text-slate-800">{supplierName}</span>.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Footer tombol — sesuai gambar contoh */}
          <div className="flex flex-col-reverse gap-2.5 border-t bg-white px-5 py-4 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="px-5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 sm:mr-auto"
            >
              Batal
            </Button>
            {waHref && (
              <Button
                asChild
                className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]"
              >
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 fill-current" />
                  {prefill?.productName ? "Chat WhatsApp Produk Ini" : "Chat WhatsApp"}
                </a>
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim Permintaan Kontak
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
