import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/authOptions'
import { randomUUID } from 'crypto'
import { generateToken, hashToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/auth-emails'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const prismaClient = prisma as unknown as {
  user: typeof prisma.user
  emailverificationtoken: typeof prisma.emailverificationtoken
}
const EMAIL_CHANGE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000
const EMAIL_RATE_LIMIT_MS = 3 * 60 * 1000

const getSiteName = async () => {
  const prismaAny = prisma as unknown as { systemSettings?: typeof prisma.systemsettings; systemsettings?: typeof prisma.systemsettings }
  const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
  if (!systemSettings) return 'เว็บไซต์ของคุณ'
  const row = await systemSettings.findUnique({ where: { key: 'site_name' } })
  return String(row?.value || '').trim() || 'เว็บไซต์ของคุณ'
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user
    const userId = sessionUser?.id ? String(sessionUser.id) : null
    if (!userId) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
    }

    const body = await req.json()
    const resend = Boolean(body?.resend)
    const emailInput = String(body?.email || '').trim().toLowerCase()

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
    }

    if (resend) {
      if (!user.email) {
        return NextResponse.json({ error: 'missing_email' }, { status: 400 })
      }

      const recentVerify = await prismaClient.emailverificationtoken.findFirst({
        where: { email: user.email },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
      if (recentVerify?.createdAt) {
        const nextAllowed = new Date(new Date(recentVerify.createdAt).getTime() + EMAIL_RATE_LIMIT_MS)
        if (nextAllowed > new Date()) {
          const waitMs = nextAllowed.getTime() - Date.now()
          return NextResponse.json({
            error: 'rate_limited',
            waitSeconds: Math.ceil(waitMs / 1000)
          }, { status: 429 })
        }
      }

      const token = generateToken()
      const tokenHash = hashToken(token)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const siteName = await getSiteName()

      await prismaClient.emailverificationtoken.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          email: user.email,
          tokenHash,
          expiresAt
        }
      })

      await sendVerificationEmail(user.email, token, siteName)
      return NextResponse.json({ ok: true })
    }

    if (!emailInput || !emailRegex.test(emailInput)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }

    const recentVerify = await prismaClient.emailverificationtoken.findFirst({
      where: { email: emailInput },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
    if (recentVerify?.createdAt) {
      const nextAllowed = new Date(new Date(recentVerify.createdAt).getTime() + EMAIL_RATE_LIMIT_MS)
      if (nextAllowed > new Date()) {
        const waitMs = nextAllowed.getTime() - Date.now()
        return NextResponse.json({
          error: 'rate_limited',
          waitSeconds: Math.ceil(waitMs / 1000)
        }, { status: 429 })
      }
    }

    if (user.emailVerifiedAt) {
      const lastVerifiedAt = new Date(user.emailVerifiedAt)
      const nextAllowed = new Date(lastVerifiedAt.getTime() + EMAIL_CHANGE_COOLDOWN_MS)
      if (nextAllowed > new Date()) {
        const waitMs = nextAllowed.getTime() - Date.now()
        return NextResponse.json({
          error: 'email_change_cooldown',
          waitSeconds: Math.ceil(waitMs / 1000)
        }, { status: 429 })
      }
    }

    const existing = await prismaClient.user.findFirst({
      where: { email: emailInput },
      select: { id: true }
    })

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'email_exists' }, { status: 409 })
    }

    const emailChanged = emailInput !== (user.email || '').toLowerCase()
    if (!emailChanged && user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true })
    }
    const nextVerifiedAt = emailChanged ? null : user.emailVerifiedAt

    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        email: emailInput,
        emailVerifiedAt: nextVerifiedAt,
        updatedAt: new Date()
      }
    })

    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const siteName = await getSiteName()

    await prismaClient.emailverificationtoken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        email: emailInput,
        tokenHash,
        expiresAt
      }
    })

    await sendVerificationEmail(emailInput, token, siteName)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/profile/email failed:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
