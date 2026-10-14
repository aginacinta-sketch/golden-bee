// Helper kecil untuk klien (tanpa dependensi server)

export function parseTagsClient(raw: string | undefined): { icon: string; label: string }[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
