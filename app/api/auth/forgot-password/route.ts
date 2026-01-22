import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { generateToken, hashToken } from '@/lib/tokens'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/auth-emails'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const prismaClient = prisma as unknown as {
  user: typeof prisma.user
  emailverificationtoken: typeof prisma.emailverificationtoken
  passwordresettoken: typeof prisma.passwordresettoken
}
const EMAIL_RATE_LIMIT_MS = 3 * 60 * 1000

const getSiteName = async () => {
  const prismaAny = prisma as unknown as { systemSettings?: typeof prisma.systemsettings; systemsettings?: typeof prisma.systemsettings }
  const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
  if (!systemSettings) return 'เว็บไซต์ของคุณ'
  const row = await systemSettings.findUnique({ where: { key: 'site_name' } })
  return String(row?.value || '').trim() || 'เว็บไซต์ของคุณ'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }

    const user = await prismaClient.user.findFirst({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true }
    })

    if (!user?.email) {
      return NextResponse.json({ error: 'email_not_found' }, { status: 404 })
    }

    const siteName = await getSiteName()
    const now = new Date()

    if (!user.emailVerifiedAt) {
      const recentVerify = await prismaClient.emailverificationtoken.findFirst({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
      if (recentVerify?.createdAt) {
        const nextAllowed = new Date(new Date(recentVerify.createdAt).getTime() + EMAIL_RATE_LIMIT_MS)
        if (nextAllowed > now) {
          const waitMs = nextAllowed.getTime() - now.getTime()
          return NextResponse.json({
            error: 'rate_limited',
            waitSeconds: Math.ceil(waitMs / 1000)
          }, { status: 429 })
        }
      }

      const token = generateToken()
      const tokenHash = hashToken(token)
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await prismaClient.emailverificationtoken.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          email,
          tokenHash,
          expiresAt
        }
      })

      await sendVerificationEmail(email, token, siteName)
      return NextResponse.json({ ok: true })
    }

    const recentReset = await prismaClient.passwordresettoken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
    if (recentReset?.createdAt) {
      const nextAllowed = new Date(new Date(recentReset.createdAt).getTime() + EMAIL_RATE_LIMIT_MS)
      if (nextAllowed > now) {
        const waitMs = nextAllowed.getTime() - now.getTime()
        return NextResponse.json({
          error: 'rate_limited',
          waitSeconds: Math.ceil(waitMs / 1000)
        }, { status: 429 })
      }
    }

    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000)

    await prismaClient.passwordresettoken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        email,
        tokenHash,
        expiresAt
      }
    })

    await sendPasswordResetEmail(email, token, siteName)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/auth/forgot-password failed:', error)
    return NextResponse.json({ ok: true })
  }
}
