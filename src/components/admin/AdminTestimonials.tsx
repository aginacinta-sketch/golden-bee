"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { adminJson, jsonInit, uploadFiles } from "@/lib/client";
import type { Testimonial } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function AdminTestimonials({ onChanged }: { onChanged: () => void }) {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminJson<Testimonial[]>("/api/admin/testimonials"));
    } catch (e) {
      toast({ title: "Gagal memuat testimoni", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, []);

  const toggleVisible = async (t: Testimonial) => {
    try {
      await adminJson(`/api/admin/testimonials/${t.id}`, jsonInit("PUT", { ...t, visible: !t.visible }));
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const remove = async (t: Testimonial) => {
    try {
      await adminJson(`/api/admin/testimonials/${t.id}`, { method: "DELETE" });
      toast({ title: "Testimoni dihapus" });
      setDeleting(null);
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Kelola testimoni pelanggan yang tampil di website.</p>
        <Button className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Tambah Testimoni
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400 md:col-span-2">Belum ada testimoni.</p>
          )}
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < t.rating ? "fill-[var(--bp-accent)] text-[var(--bp-accent)]" : "fill-slate-200 text-slate-200"}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleVisible(t)} aria-label={t.visible ? "Sembunyikan" : "Tampilkan"}>
                      {t.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(t)} aria-label="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-slate-600">“{t.content}”</p>
                <div className="flex items-center gap-3">
                  {t.photo ? (
                     
                    <img src={t.photo} alt={t.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bp-accent-soft)] text-xs font-bold text-[var(--bp-accent-dark)]">
                      {t.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-slate-400">{[t.role, t.company].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TestimonialFormDialog
        key={editing?.id || (creating ? "new" : "closed")}
        open={creating || !!editing}
        testimonial={editing}
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

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus testimoni ini?</AlertDialogTitle>
            <AlertDialogDescription>Testimoni dari “{deleting?.name}” akan dihapus permanen.</AlertDialogDescription>
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

function TestimonialFormDialog({
  open,
  testimonial,
  onClose,
  onSaved,
}: {
  open: boolean;
  testimonial: Testimonial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<Testimonial>>({});
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(testimonial ? { ...testimonial } : { name: "", role: "", company: "", content: "", photo: "", rating: 5, visible: true });
  }, [testimonial, open]);

  const uploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const res = await uploadFiles([files[0]]);
      if (res[0]) setForm((f) => ({ ...f, photo: res[0].url }));
    } catch (e) {
      toast({ title: "Gagal mengunggah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  const save = async () => {
    if (!form.name?.trim() || !form.content?.trim()) {
      toast({ title: "Nama dan isi testimoni wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await adminJson(`/api/admin/testimonials/${form.id}`, jsonInit("PUT", form));
      } else {
        await adminJson("/api/admin/testimonials", jsonInit("POST", form));
      }
      toast({ title: "Tersimpan!", description: "Testimoni berhasil disimpan." });
      onSaved();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto nice-scroll sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Testimoni" : "Tambah Testimoni"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nama Pelanggan *</Label>
              <Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Perusahaan</Label>
              <Input value={form.company || ""} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Jabatan</Label>
              <Input value={form.role || ""} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Penilaian</Label>
              <Select value={String(form.rating ?? 5)} onValueChange={(v) => setForm((f) => ({ ...f, rating: Number(v) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r} bintang
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Isi Testimoni *</Label>
            <Textarea rows={4} value={form.content || ""} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Foto (opsional)</Label>
            <div className="flex items-center gap-3">
              {form.photo ? (
                 
                <img src={form.photo} alt="Foto" className="h-12 w-12 rounded-full object-cover" />
              ) : null}
              <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files)} />
              <Button type="button" variant="outline" size="sm" onClick={() => photoInput.current?.click()}>
                Unggah Foto
              </Button>
              <Input
                className="flex-1"
                value={form.photo || ""}
                onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))}
                placeholder="URL foto…"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="tf-visible" className="cursor-pointer">Tampilkan di website</Label>
            <Switch id="tf-visible" checked={form.visible !== false} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving} className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
