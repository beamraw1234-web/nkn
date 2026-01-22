import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const commonPrismaOptions: Prisma.PrismaClientOptions = {
  log: ['info', 'warn', 'error'],
  errorFormat: 'pretty'
}

export let prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient(commonPrismaOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function resetPrisma() {
  try {
    if (prisma) {
      await prisma.$disconnect().catch(() => {})
    }
  } catch (e) {
    // ignore
  }

  // Reload environment variables from .env so runtime changes are picked up
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    const content = fs.readFileSync(envPath, 'utf8')
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx === -1) return
      let key = trimmed.slice(0, idx)
      let val = trimmed.slice(idx + 1)
      key = key.trim()
      val = val.trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    })
    console.info('Reloaded .env from', envPath)
  } catch (e) {
    // ignore
  }

  prisma = new PrismaClient(commonPrismaOptions)
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

  try {
    await prisma.$connect()
  } catch (e) {
    // connecting may fail; caller will handle
  }

  return prisma
}

export async function getSystemSettingsSafe() {
  try {
    // Use a temporary PrismaClient for this safe check so failures
    // don't bubble from the global `prisma` used elsewhere.
    const { PrismaClient } = await import('@prisma/client')
    const temp = new PrismaClient(commonPrismaOptions)
    try {
      const tempAny = temp as unknown as { systemSettings?: { findMany: () => Promise<unknown> }; systemsettings?: { findMany: () => Promise<unknown> } }
      const systemSettings = tempAny.systemSettings ?? tempAny.systemsettings
      if (!systemSettings) throw new Error('Prisma model delegate for SystemSettings not found')

      const res = await systemSettings.findMany()
      await temp.$disconnect().catch(() => {})
      return res
    } catch (e) {
      await temp.$disconnect().catch(() => {})
      console.error('getSystemSettingsSafe: temp query failed', e)
      return null
    }
  } catch (e) {
    console.error('getSystemSettingsSafe: unexpected error', e)
    return null
  }
}
