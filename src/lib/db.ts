import { PrismaClient } from '@prisma/client'
import path from 'path'

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
  process.env.DATABASE_URL = `file:${dbPath}`
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
