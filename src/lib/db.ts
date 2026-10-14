import path from "path"
import fs from "fs"
import { PrismaClient } from '@prisma/client'

// ============================================================
// Resolusi lokasi database SQLite yang TAHAN LINGKUNGAN:
//  1) DATABASE_URL di-set (sandbox dev/standalone/VPS .env) → pakai apa adanya.
//  2) Tidak di-set (mis. deploy Vercel dari GitHub — .env memang tidak ikut,
//     lihat .gitignore) → pakai <cwd>/db/custom.db dari repo.
//     Di hosting dengan filesystem READ-ONLY (Vercel serverless), SQLite
//     di mode WAL butuh direktori writable untuk berkas sampingan -shm/-wal;
//     kalau tidak, bahkan SELECT pun bisa gagal. Solusi: salin db ke /tmp
//     (satu-satunya direktori writable) dan arahkan URL ke sana.
//     CATATAN JUJUR: di serverless, hasil tulisan ke /tmp hilang saat
//     instance dingin ulang — untuk simpan permanen gunakan VPS/hosting
//     sendiri (lihat PANDUAN-HOSTING.md).
// ============================================================
function resolusiUrlDatabase(): string {
  const localDb = path.join(process.cwd(), "db", "custom.db")

  if (process.env.DATABASE_URL) {
    const raw = process.env.DATABASE_URL
    if (raw.startsWith("file:")) {
      let filePath = raw.replace(/^file:/, "")
      if (filePath.startsWith(".")) {
        filePath = path.resolve(process.cwd(), filePath)
      }
      if (fs.existsSync(filePath)) {
        return `file:${filePath}`
      }
      // If the path in DATABASE_URL does not exist, fall back to localDb if present
      if (fs.existsSync(localDb)) {
        return `file:${localDb}`
      }
    } else {
      return raw
    }
  }

  if (fs.existsSync(localDb)) {
    return `file:${localDb}`
  }

  try {
    const salinan = "/tmp/goldenbee-custom.db"
    if (fs.existsSync(salinan)) {
      return `file:${salinan}`
    }
  } catch {}

  return `file:${localDb}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const resolvedDbUrl = resolusiUrlDatabase()
// CRITICAL: Prisma query engine reads process.env.DATABASE_URL, so sync it:
process.env.DATABASE_URL = resolvedDbUrl

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolvedDbUrl,
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
