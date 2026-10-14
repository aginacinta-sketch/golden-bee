"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, ShieldCheck, ExternalLink } from "lucide-react";
import { apiJson } from "@/lib/client";
import { useToast } from "@/hooks/use-toast";

export function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiJson<{ token: string }>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      onLogin(res.token);
      toast({ title: "Selamat datang!", description: "Anda berhasil masuk ke panel admin." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B3B2E] text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Panel Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-pass">Kata Sandi</Label>
              <Input
                id="admin-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi admin"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="bg-[#0B3B2E] text-white hover:bg-[#0B3B2E]/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Masuk
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.hash = "";
                window.scrollTo({ top: 0 });
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Lihat Website
            </Button>
            <p className="text-center text-xs leading-relaxed text-slate-400">
              Halaman ini hanya dapat diakses pemilik website. Tautan yang dibagikan
              ke pengunjung (mode QR/publik) tidak menampilkan halaman admin sama sekali.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
