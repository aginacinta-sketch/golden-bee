"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function VideoDialog({ src, title, onClose }: { src: string | null; title?: string; onClose: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black">
        <DialogTitle className="sr-only">{title || "Video Produk"}</DialogTitle>
        {src && (
          <video key={src} src={src} controls autoPlay className="w-full max-h-[80vh] bg-black" />
        )}
      </DialogContent>
    </Dialog>
  );
}
