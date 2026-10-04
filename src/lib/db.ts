import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import os from 'os'

function getDatabaseUrl(): string {
  // The Prisma schema uses the SQLite provider, which only accepts `file:` URLs.
  // A non-file DATABASE_URL (e.g. a Postgres connection string configured on the
  // hosting platform) would fail datasource validation, so it is ignored here.
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    console.warn('[lib/db] Ignoring non-SQLite DATABASE_URL; using bundled prisma/dev.db')
  }

  const sourceDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')

  // Detect serverless environment (Vercel, AWS Lambda)
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION) ||
    Boolean(process.env.LAMBDA_TASK_ROOT)

  if (isServerless) {
    const tmpDir = process.env.VERCEL ? '/tmp' : os.tmpdir()
    const tmpDbPath = path.join(tmpDir, 'dev.db')
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }
      if (!fs.existsSync(tmpDbPath)) {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath)
        }
      }
      return `file:${tmpDbPath}`
    } catch (err) {
      console.error('[lib/db] Error copying SQLite DB to /tmp:', err)
    }
  }

  return `file:${sourceDbPath}`
}

const resolvedDbUrl = getDatabaseUrl()
process.env.DATABASE_URL = resolvedDbUrl

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
