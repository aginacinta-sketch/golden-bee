"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Inbox,
  Loader2,
  MessageSquare,
  Package,
  PackageSearch,
  RotateCw,
  Star,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminJson } from "@/lib/client";
import type { ContactRequest, SettingsMap } from "@/lib/types";

interface DashboardData {
  produk: { total: number; aktif: number; unggulan: number };
  pesan: {
    total: number;
    baru: number;
    dibaca: number;
    selesai: number;
    hariIni: number;
    perHari: { label: string; tanggal: string; jumlah: number }[];
    topProduk: { nama: string; jumlah: number }[];
  };
  testimoni: { total: number; tampil: number };
  media: { total: number; ukuran: number };
  pesanTerbaru: ContactRequest[];
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  baru: { label: "Baru", className: "bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent)]" },
  dibaca: { label: "Dibaca", className: "bg-slate-200 text-slate-700 hover:bg-slate-200" },
  selesai: { label: "Selesai", className: "bg-green-100 text-green-700 hover:bg-green-100" },
};

function formatUkuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  settings: SettingsMap;
  /** Pindah ke tab admin lain (mis. klik kartu statistik / buka kotak masuk). */
  onNavigate: (tab: string) => void;
}

export function AdminDashboard({ settings, onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await adminJson<DashboardData>("/api/admin/dashboard");
      setData(d);
      setError(null);
      setUpdated(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan pada server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accent = settings.accentColor || "#84BD00";
  const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-slate-500">{error || "Data tidak tersedia."}</p>
          <Button variant="outline" onClick={() => void load()}>
            <RotateCw className="h-4 w-4" /> Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total7Hari = data.pesan.perHari.reduce((s, d) => s + d.jumlah, 0);
  const maxTop = data.pesan.topProduk[0]?.jumlah || 1;

  const kartu = [
    {
      tab: "pesan",
      label: "Pesan Baru",
      value: data.pesan.baru,
      sub: `${data.pesan.hariIni} pesan masuk hari ini`,
      icon: Inbox,
      highlight: true,
    },
    {
      tab: "pesan",
      label: "Total Pesan",
      value: data.pesan.total,
      sub: `${data.pesan.dibaca} dibaca · ${data.pesan.selesai} selesai`,
      icon: MessageSquare,
      highlight: false,
    },
    {
      tab: "produk",
      label: "Produk Aktif",
      value: data.produk.aktif,
      sub: `${data.produk.unggulan} unggulan dari ${data.produk.total} produk`,
      icon: Package,
      highlight: false,
    },
    {
      tab: "testimoni",
      label: "Testimoni Tampil",
      value: data.testimoni.tampil,
      sub: `dari ${data.testimoni.total} testimoni tersimpan`,
      icon: Star,
      highlight: false,
    },
  ];

  return (
    <div className="grid gap-4">
      {/* Kepala dashboard */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard</h2>
          <p className="text-sm text-slate-500">
            {tanggalPanjang} · Ringkasan aktivitas katalog Anda
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-center sm:w-auto"
          onClick={() => void load()}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Segarkan
        </Button>
      </div>

      {/* Kartu statistik — klik untuk membuka menu terkait */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kartu.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onNavigate(c.tab)}
            aria-label={`${c.label}: ${c.value}. Buka menu ${c.tab}`}
            className="text-left"
          >
            <Card
              className={`h-full transition hover:shadow-md ${
                c.highlight && c.value > 0 ? "border-[var(--bp-accent)]" : ""
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      c.highlight
                        ? "bg-[var(--bp-accent-soft)] text-[var(--bp-accent-dark)]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <c.icon className="h-5 w-5" />
                  </span>
                  {c.highlight && c.value > 0 && (
                    <Badge className="bg-[var(--bp-accent)] text-white hover:bg-[var(--bp-accent)]">
                      Perlu tindakan
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{c.value}</p>
                <p className="text-sm font-medium text-slate-600">{c.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{c.sub}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Grafik & produk teratas */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Pesan Masuk — 7 Hari Terakhir</h3>
                <p className="text-xs text-slate-400">Jumlah permintaan kontak per hari</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Total {total7Hari}
              </Badge>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pesan.perHari} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    formatter={(value) => [`${String(value)} pesan`, "Masuk"]}
                    labelFormatter={(label, payload) => {
                      const p0 = payload?.[0] as { payload?: { tanggal?: string } } | undefined;
                      return p0?.payload?.tanggal || String(label);
                    }}
                    contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="jumlah" name="Pesan masuk" fill={accent} radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-sm font-bold text-slate-800">Produk Paling Diminta</h3>
            <p className="text-xs text-slate-400">Top 5 berdasarkan pesan masuk</p>
            {data.pesan.topProduk.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
                <PackageSearch className="h-8 w-8 text-slate-300" />
                <p className="text-xs text-slate-400">
                  Belum ada pesan yang menyebut produk tertentu.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3.5">
                {data.pesan.topProduk.map((p) => (
                  <li key={p.nama}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <PackageSearch className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-medium text-slate-700">{p.nama}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">{p.jumlah}x</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(8, (p.jumlah / maxTop) * 100)}%`,
                          backgroundColor: accent,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pesan terbaru */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pesan Terbaru</h3>
              <p className="text-xs text-slate-400">5 permintaan kontak terakhir dari pengunjung</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => onNavigate("pesan")}>
              Buka Kotak Masuk <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {data.pesanTerbaru.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <Inbox className="h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-400">Belum ada pesan masuk.</p>
            </div>
          ) : (
            <ul className="nice-scroll mt-4 max-h-96 space-y-3 overflow-y-auto">
              {data.pesanTerbaru.map((m) => {
                const st = STATUS_BADGE[m.status] || STATUS_BADGE.baru;
                return (
                  <li key={m.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">{m.name}</p>
                      <Badge className={st.className}>{st.label}</Badge>
                      {m.productName && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--bp-accent-soft)] px-1.5 py-0.5 text-xs text-[var(--bp-accent-dark)]">
                          <PackageSearch className="h-3 w-3" />
                          {m.productName}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">
                        {new Date(m.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-600">{m.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Ringkasan media tersimpan */}
      <p className="text-xs text-slate-400">
        Media tersimpan: {data.media.total} berkas ({formatUkuran(data.media.ukuran)})
        {updated && ` · Terakhir diperbarui pukul ${updated}`}
      </p>
    </div>
  );
}
