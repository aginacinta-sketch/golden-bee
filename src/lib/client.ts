// Helper fetch untuk sisi klien

export const ADMIN_TOKEN_KEY = "b2b_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("x-admin-token", token);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    throw new Error("Sesi berakhir. Silakan masuk kembali.");
  }
  return res;
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Terjadi kesalahan pada server.");
  }
  return res.json() as Promise<T>;
}

export async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await adminFetch(url, init);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Terjadi kesalahan pada server.");
  }
  return res.json() as Promise<T>;
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// Unggah berkas media, kembalikan daftar URL
export async function uploadFiles(files: File[]): Promise<{ url: string; name: string; type: string; size: number }[]> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await adminFetch("/api/admin/media", { method: "POST", body: fd });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Gagal mengunggah berkas.");
  }
  const j = (await res.json()) as { files: { url: string; name: string; type: string; size: number }[] };
  return j.files;
}
