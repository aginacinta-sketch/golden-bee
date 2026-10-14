"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Loader2, Pencil, Plus, Search, Star, Trash2, Upload, X } from "lucide-react";
import { adminJson, jsonInit, uploadFiles } from "@/lib/client";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const EMPTY: Omit<Product, "id"> = {
  name: "",
  category: "",
  description: "",
  features: [],
  images: [],
  video: "",
  unit: "",
  minOrder: "",
  priceMin: null,
  priceMax: null,
  featured: false,
  active: true,
  sortOrder: 0,
};

export function AdminProducts({ onChanged }: { onChanged: () => void }) {
  const { toast } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminJson<Product[]>("/api/admin/products"));
    } catch (e) {
      toast({ title: "Gagal memuat produk", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, []);

  const filtered = items.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const toggleActive = async (p: Product) => {
    try {
      await adminJson(`/api/admin/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, active: !p.active }),
      });
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const remove = async (p: Product) => {
    try {
      await adminJson(`/api/admin/products/${p.id}`, { method: "DELETE" });
      toast({ title: "Produk dihapus", description: p.name });
      setDeleting(null);
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk…" className="pl-9" />
        </div>
        <Button
          className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4" /> Tambah Produk
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto nice-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Produk</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Unggulan</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Aktif</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Belum ada produk. Klik “Tambah Produk” untuk mulai.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-slate-100">
                            {p.images[0] ? (
                               
                              <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <span className="font-medium text-slate-800 line-clamp-2 max-w-56">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.category || "-"}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <button onClick={() => toggleActive({ ...p, featured: !p.featured })} aria-label="Ubah status unggulan">
                          <Star className={`h-5 w-5 ${p.featured ? "fill-[var(--bp-accent)] text-[var(--bp-accent)]" : "text-slate-300"}`} />
                        </button>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} aria-label="Aktifkan produk" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label="Edit produk">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(p)} aria-label="Hapus produk">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog tambah / edit */}
      <ProductFormDialog
        key={editing?.id || (creating ? "new" : "closed")}
        open={creating || !!editing}
        product={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={async () => {
          setCreating(false);
          setEditing(null);
          await load();
          onChanged();
        }}
      />

      {/* Dialog konfirmasi hapus */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk “{deleting?.name}” akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
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

function ProductFormDialog({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Omit<Product, "id"> & { id?: string }>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setForm({ ...product });
    } else {
      setForm({ ...EMPTY });
    }
  }, [product, open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      const res = await uploadFiles(Array.from(files));
      set("images", [...form.images, ...res.map((r) => r.url)]);
      toast({ title: "Gambar diunggah", description: `${res.length} berkas berhasil.` });
    } catch (e) {
      toast({ title: "Gagal mengunggah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setUploadingImg(false);
      if (imgInput.current) imgInput.current.value = "";
    }
  };

  const addVideo = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingVideo(true);
    try {
      const res = await uploadFiles([files[0]]);
      if (res[0]) set("video", res[0].url);
      toast({ title: "Video diunggah" });
    } catch (e) {
      toast({ title: "Gagal mengunggah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setUploadingVideo(false);
      if (videoInput.current) videoInput.current.value = "";
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama produk wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, features: form.features };
      if (form.id) {
        await adminJson(`/api/admin/products/${form.id}`, jsonInit("PUT", payload));
      } else {
        await adminJson("/api/admin/products", jsonInit("POST", payload));
      }
      toast({ title: "Tersimpan!", description: `Produk “${form.name}” berhasil disimpan.` });
      onSaved();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto nice-scroll sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nama Produk *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="cth. Madu Hutan Murni" />
            </div>
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="cth. Makanan dan Minuman" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Deskripsi</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Poin Fitur (satu poin per baris)</Label>
            <Textarea
              rows={4}
              value={form.features.join("\n")}
              onChange={(e) => set("features", e.target.value.split("\n").filter((x) => x.trim() !== ""))}
              placeholder={"Mempertahankan rasa asli\nKemasan ekspor"}
            />
          </div>

          {/* Gambar */}
          <div className="grid gap-2">
            <Label>Gambar Produk</Label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                  { }
                  <img src={img} alt={`Gambar ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Hapus gambar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => imgInput.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-slate-400 transition hover:border-[var(--bp-accent)] hover:text-[var(--bp-accent-dark)]"
              >
                {uploadingImg ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-[10px]">Unggah</span>
              </button>
            </div>
            <input
              ref={imgInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addImages(e.target.files)}
            />
            <Input
              placeholder="atau tempel URL gambar lalu tekan Enter…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) {
                    set("images", [...form.images, v]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          </div>

          {/* Video */}
          <div className="grid gap-2">
            <Label>Video Produk (opsional)</Label>
            <div className="flex items-center gap-3">
              <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => addVideo(e.target.files)} />
              <Button type="button" variant="outline" size="sm" onClick={() => videoInput.current?.click()} disabled={uploadingVideo}>
                {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Unggah Video
              </Button>
              {form.video && (
                <span className="flex max-w-xs items-center gap-1 truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {form.video}
                  <button type="button" onClick={() => set("video", "")} aria-label="Hapus video">
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Satuan</Label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="cth. kg, ton, karton" />
            </div>
            <div className="grid gap-2">
              <Label>Pesanan Minimum</Label>
              <Input value={form.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="cth. 100" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Est. Harga Minimum (Rp)</Label>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={form.priceMin ?? ""}
                onChange={(e) => set("priceMin", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="cth. 115000"
              />
            </div>
            <div className="grid gap-2">
              <Label>Est. Harga Maksimum (Rp)</Label>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={form.priceMax ?? ""}
                onChange={(e) => set("priceMax", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="cth. 145000"
              />
              <p className="text-xs text-slate-400">Tampil pada dialog permintaan penawaran (opsional).</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="pf-featured" className="cursor-pointer">Produk Unggulan</Label>
              <Switch id="pf-featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="pf-active" className="cursor-pointer">Tampilkan di Katalog</Label>
              <Switch id="pf-active" checked={form.active} onCheckedChange={(v) => set("active", v)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simpan Produk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
