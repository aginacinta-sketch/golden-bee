"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, KeyRound, Link2, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { adminJson } from "@/lib/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Kartu "Kunci Akses Admin" — pintu masuk alternatif untuk perangkat/baru:
 * tautan berkunci rahasia `/?k=KUNCI#admin`. Mengetik alamat + #admin saja
 * TIDAK membuka apa pun; panel dibuka lewat tombol Admin di header website,
 * atau lewat tautan berkunci ini yang dapat diganti kapan saja.
 */
function KartuKunciAkses() {
  const { toast } = useToast();
  const [kunci, setKunci] = useState<string | null>(null);
  const [tautan, setTautan] = useState("");
  const [baru, setBaru] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let batal = false;
    adminJson<{ key: string }>("/api/admin/gate")
      .then((r) => {
        if (!batal) setKunci(r.key);
      })
      .catch(() => {});
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    if (kunci) setTautan(`${window.location.origin}/?k=${encodeURIComponent(kunci)}#admin`);
  }, [kunci]);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(tautan);
      toast({ title: "Tautan disalin", description: "Tempel di perangkat/browser lain untuk membuka panel admin." });
    } catch {
      toast({ title: "Gagal menyalin", description: "Salin manual alamat di atas.", variant: "destructive" });
    }
  };

  const gantiKunci = async (e: React.FormEvent) => {
    e.preventDefault();
    if (baru.trim().length < 5) {
      toast({ title: "Kunci terlalu pendek", description: "Kunci akses minimal 5 karakter.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminJson("/api/admin/gate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newKey: baru.trim() }),
      });
      setKunci(baru.trim());
      setBaru("");
      toast({ title: "Kunci akses diganti!", description: "Tautan berkunci lama tidak berlaku lagi." });
    } catch (err) {
      toast({ title: "Gagal mengganti kunci", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-[var(--bp-accent)]" /> Kunci Akses Admin
        </CardTitle>
        <CardDescription>
          Mengetik alamat website + #admin tidak membuka apa pun. Panel dibuka lewat
          tombol Admin di header website Anda; untuk perangkat atau browser baru,
          gunakan tautan berkunci di bawah ini (kunci bisa diganti kapan saja).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {kunci ? (
          <div className="grid gap-2">
            <Label>Tautan Berkunci</Label>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                <Link2 className="mr-1.5 inline h-3.5 w-3.5 text-neutral-400" />
                {tautan}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={salin} className="shrink-0">
                <Copy className="h-3.5 w-3.5" /> Salin
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-400">Memuat kunci akses…</p>
        )}
        <form onSubmit={gantiKunci} className="grid gap-2">
          <Label htmlFor="kunci-baru">Ganti Kunci Akses</Label>
          <div className="flex items-center gap-2">
            <Input
              id="kunci-baru"
              value={baru}
              onChange={(e) => setBaru(e.target.value)}
              placeholder="Kunci baru (minimal 5 karakter)"
              autoComplete="off"
              className="flex-1"
            />
            <Button type="submit" disabled={saving || !baru.trim()} className="shrink-0 bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Ganti
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminAccount({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ title: "Konfirmasi tidak cocok", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminJson("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      });
      toast({ title: "Kata sandi diganti!", description: "Gunakan kata sandi baru pada login berikutnya." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      toast({ title: "Gagal mengganti", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid max-w-xl gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ganti Kata Sandi</CardTitle>
          <CardDescription>Amankan panel admin Anda dengan kata sandi yang kuat.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Kata Sandi Saat Ini</Label>
              <Input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Kata Sandi Baru</Label>
              <Input type="password" required value={next} onChange={(e) => setNext(e.target.value)} placeholder="Minimal 5 karakter" />
            </div>
            <div className="grid gap-2">
              <Label>Konfirmasi Kata Sandi Baru</Label>
              <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving} className="w-fit bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent-dark)]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Simpan Kata Sandi
            </Button>
          </form>
        </CardContent>
      </Card>

      <KartuKunciAkses />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keluar</CardTitle>
          <CardDescription>Akhiri sesi admin di perangkat ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="text-destructive" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> Keluar dari Panel Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
