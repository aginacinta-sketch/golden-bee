"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, Download, FileVideo, Loader2, Maximize2, Trash2, Upload } from "lucide-react";
import { adminJson, uploadFiles } from "@/lib/client";
import type { MediaItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function AdminMedia() {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const terakhirDilihatRef = useRef<MediaItem | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminJson<MediaItem[]>("/api/media"));
    } catch (e) {
      toast({ title: "Gagal memuat media", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

  }, []);

  const doUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadFiles(files);
      toast({ title: "Berhasil diunggah", description: `${res.length} berkas ditambahkan ke pustaka media.` });
      await load();
    } catch (e) {
      toast({ title: "Gagal mengunggah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (m: MediaItem) => {
    try {
      await adminJson(`/api/admin/media/${m.id}`, { method: "DELETE" });
      toast({ title: "Media dihapus", description: m.name });
      setDeleting(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const copyUrl = async (m: MediaItem) => {
    const url = `${window.location.origin}/api/media/${m.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast({ title: "URL disalin", description: url });
    } catch {
      toast({ title: "Gagal menyalin URL", variant: "destructive" });
    }
  };

  // Unduh berkas asli: ambil blob lalu simpan dengan nama aslinya
  const unduh = async (m: MediaItem) => {
    setDownloading(m.id);
    try {
      const res = await fetch(`/api/media/${m.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = m.name || `media-${m.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: "Unduhan dimulai", description: m.name });
    } catch (e) {
      toast({ title: "Gagal mengunduh", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const fmtTanggal = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="grid gap-4">
      {/* Area unggah */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          doUpload(Array.from(e.dataTransfer.files));
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-[var(--bp-accent)] bg-[var(--bp-accent-soft)]" : "border-slate-300 bg-slate-50"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[var(--bp-accent-dark)]" />
        ) : (
          <Upload className="h-8 w-8 text-slate-400" />
        )}
        <p className="text-sm font-medium text-slate-600">
          Tarik &amp; lepas berkas gambar/video ke sini, atau
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            doUpload(Array.from(e.target.files || []));
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Button size="sm" className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" /> Pilih Berkas
        </Button>
        <p className="text-xs text-slate-400">Format: JPG, PNG, WebP, GIF, MP4, WebM · Maks. 25 MB per berkas</p>
      </div>

      {/* Galeri */}
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Pustaka media masih kosong.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((m) => (
            <Card key={m.id} className="group overflow-hidden">
              <div className="relative aspect-square bg-slate-100">
                {m.type === "image" ? (
                  <button
                    type="button"
                    onClick={() => setViewing(m)}
                    aria-label={`Lihat penuh: ${m.name}`}
                    className="absolute inset-0 h-full w-full cursor-zoom-in"
                  >
                    <img src={`/api/media/${m.id}`} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewing(m)}
                    aria-label={`Putar: ${m.name}`}
                    className="absolute inset-0 h-full w-full cursor-pointer"
                  >
                    <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                      <FileVideo className="h-8 w-8" />
                      <span className="text-[10px] uppercase">{m.mimeType.split("/")[1]}</span>
                    </span>
                  </button>
                )}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="pointer-events-auto h-9 w-9"
                    onClick={() => setViewing(m)}
                    aria-label="Lihat penuh"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="pointer-events-auto h-9 w-9"
                    onClick={() => unduh(m)}
                    aria-label="Unduh berkas"
                    disabled={downloading === m.id}
                  >
                    {downloading === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="pointer-events-auto h-9 w-9"
                    onClick={() => copyUrl(m)}
                    aria-label="Salin URL"
                  >
                    {copiedId === m.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="pointer-events-auto h-9 w-9"
                    onClick={() => setDeleting(m)}
                    aria-label="Hapus media"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="truncate text-xs font-medium text-slate-700" title={m.name}>{m.name}</p>
                <p className="text-[10px] text-slate-400">{fmtSize(m.size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus media ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Berkas “{deleting?.name}” akan dihapus permanen. Produk yang memakainya akan kehilangan gambar tersebut.
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

      {/* Penampil penuh: gambar utuh / pemutar video + info + unduh */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
          <div className="flex max-h-[72vh] items-center justify-center overflow-auto bg-slate-950">
            {(() => {
              // Selama animasi tutup (viewing = null) tetap tampilkan media
              // terakhir agar tidak ada kedipan; elemen <img> hanya dirender
              // bila benar-benar ada media (menghindari warning src="").
              const tampil = viewing ?? terakhirDilihatRef.current;
              if (viewing) terakhirDilihatRef.current = viewing;
              if (!tampil) return null;
              return tampil.type === "video" ? (
                <video key={tampil.id} src={`/api/media/${tampil.id}`} controls className="max-h-[72vh] w-full">
                  <track kind="captions" />
                </video>
              ) : (
                <img
                  key={tampil.id}
                  src={`/api/media/${tampil.id}`}
                  alt={tampil.name}
                  className="max-h-[72vh] w-auto max-w-full object-contain"
                />
              );
            })()}
          </div>
          <DialogHeader className="px-4 pb-1 pt-3 text-left">
            <DialogTitle className="truncate text-sm" title={viewing?.name}>
              {viewing?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewing ? `${viewing.mimeType} · ${fmtSize(viewing.size)} · ${fmtTanggal(viewing.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 border-t px-4 py-3">
            <Button
              size="sm"
              className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]"
              onClick={() => viewing && unduh(viewing)}
              disabled={downloading === viewing?.id}
            >
              {downloading === viewing?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Unduh
            </Button>
            <Button size="sm" variant="outline" onClick={() => viewing && copyUrl(viewing)}>
              {copiedId === viewing?.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              Salin URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
