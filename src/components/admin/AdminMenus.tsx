"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { adminJson, jsonInit } from "@/lib/client";
import { DynamicIcon, ICON_OPTIONS } from "@/lib/icons";
import type { MenuItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const TARGET_OPTIONS = [
  { value: "#beranda", label: "Beranda (atas)" },
  { value: "#produk", label: "Bagian Produk" },
  { value: "#tentang", label: "Bagian Tentang" },
  { value: "#testimoni", label: "Bagian Testimoni" },
  { value: "#kontak", label: "Bagian Kontak (footer)" },
];

export function AdminMenus({ onChanged }: { onChanged: () => void }) {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminJson<MenuItem[]>("/api/admin/menus"));
    } catch (e) {
      toast({ title: "Gagal memuat menu", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, []);

  const saveOrder = async (list: MenuItem[]) => {
    setBusy(true);
    try {
      await Promise.all(
        list.map((m, i) =>
          adminJson(`/api/admin/menus/${m.id}`, jsonInit("PUT", { ...m, order: i + 1 }))
        )
      );
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Gagal mengurutkan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const list = [...items];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setItems(list);
    saveOrder(list);
  };

  const toggleVisible = async (m: MenuItem) => {
    try {
      await adminJson(`/api/admin/menus/${m.id}`, jsonInit("PUT", { ...m, visible: !m.visible }));
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const remove = async (m: MenuItem) => {
    try {
      await adminJson(`/api/admin/menus/${m.id}`, { method: "DELETE" });
      toast({ title: "Menu dihapus", description: m.label });
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
        <p className="text-sm text-slate-500">Atur menu navigasi yang tampil di website.</p>
        <Button className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Tambah Menu
        </Button>
      </div>

      <Card>
        <CardContent className="p-2">
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada menu.</p>
          ) : (
            <ul className="divide-y">
              {items.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 px-2 py-3">
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="Naikkan urutan" className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1 || busy} aria-label="Turunkan urutan" className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                    <DynamicIcon name={m.icon} className="h-4 w-4 text-slate-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{m.label}</p>
                    <p className="truncate text-xs text-slate-400">{m.target}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="hidden text-xs text-slate-400 sm:inline">Tampil</span>
                      <Switch checked={m.visible} onCheckedChange={() => toggleVisible(m)} aria-label="Tampilkan di website" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(m)} aria-label="Edit menu">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(m)} aria-label="Hapus menu">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MenuFormDialog
        key={editing?.id || (creating ? "new" : "closed")}
        open={creating || !!editing}
        menu={editing}
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
            <AlertDialogTitle>Hapus menu ini?</AlertDialogTitle>
            <AlertDialogDescription>Menu “{deleting?.label}” akan dihapus dari navigasi website.</AlertDialogDescription>
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

function MenuFormDialog({
  open,
  menu,
  onClose,
  onSaved,
}: {
  open: boolean;
  menu: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(menu ? { ...menu } : { label: "", target: "#produk", icon: "package", visible: true });
  }, [menu, open]);

  const save = async () => {
    if (!form.label?.trim()) {
      toast({ title: "Nama menu wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await adminJson(`/api/admin/menus/${form.id}`, jsonInit("PUT", form));
      } else {
        await adminJson("/api/admin/menus", jsonInit("POST", form));
      }
      toast({ title: "Tersimpan!", description: `Menu “${form.label}” berhasil disimpan.` });
      onSaved();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nama Menu</Label>
            <Input value={form.label || ""} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="cth. Produk Kami" />
          </div>
          <div className="grid gap-2">
            <Label>Bagian Tujuan</Label>
            <Select value={form.target} onValueChange={(v) => setForm((f) => ({ ...f, target: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih bagian" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={form.target || ""}
              onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
              placeholder="atau tulis target kustom (#…)"
            />
          </div>
          <div className="grid gap-2">
            <Label>Ikon</Label>
            <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih ikon" />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((ic) => (
                  <SelectItem key={ic} value={ic}>
                    <span className="flex items-center gap-2">
                      <DynamicIcon name={ic} className="h-4 w-4" />
                      {ic}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="mf-visible" className="cursor-pointer">Tampilkan di website</Label>
            <Switch id="mf-visible" checked={form.visible !== false} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving} className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simpan Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
