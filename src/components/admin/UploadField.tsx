"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFiles } from "@/lib/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  type?: "image" | "video";
  placeholder?: string;
}

// Kolom unggah media serbaguna: pratinjau + tombol unggah + input URL manual
export function UploadField({ value, onChange, accept, type = "image", placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadFiles([files[0]]);
      if (res[0]) {
        onChange(res[0].url);
        toast({ title: "Berhasil diunggah", description: res[0].name });
      }
    } catch (e) {
      toast({ title: "Gagal mengunggah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
          {value ? (
            type === "video" ? (
              <video src={value} className="h-full w-full object-cover" muted />
            ) : (
               
              <img src={value} alt="Pratinjau" className="h-full w-full object-cover" />
            )
          ) : (
            <Link2 className="h-6 w-6 text-slate-300" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Tempel URL gambar atau unggah berkas…"}
          />
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept || (type === "video" ? "video/*" : "image/*")}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Unggah
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange("")}>
                <X className="h-4 w-4" />
                Hapus
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
