import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { createLog } from '@/lib/log'
import { Prisma } from '@prisma/client'
import { generateToken, hashToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/auth-emails'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const prismaClient = prisma as unknown as {
  user: typeof prisma.user
  emailverificationtoken: typeof prisma.emailverificationtoken
}

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
    const username = String(body?.username || '').trim()
    const password = String(body?.password || '')
    const fullName = String(body?.fullName || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const captchaToken = String(body?.captchaToken || '')

    if (!username || !password || !email) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 })
    }
    const prismaAny = prisma as unknown as { systemSettings?: typeof prisma.systemsettings; systemsettings?: typeof prisma.systemsettings }
    const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
    let captchaEnabled = true
    let captchaSecretKey = ''
    let captchaSiteKey = ''
    if (systemSettings) {
      const [captchaSetting, secretSetting, siteSetting] = await Promise.all([
        systemSettings.findUnique({ where: { key: 'captcha_enabled' } }),
        systemSettings.findUnique({ where: { key: 'captcha_secret_key' } }),
        systemSettings.findUnique({ where: { key: 'captcha_site_key' } })
      ])
      if (captchaSetting?.value === 'false') captchaEnabled = false
      captchaSecretKey = String(secretSetting?.value || '')
      captchaSiteKey = String(siteSetting?.value || '')
    }

    if (captchaEnabled) {
      if (!captchaToken) {
        return NextResponse.json({ error: 'captcha_missing' }, { status: 400 })
      }

      if (!captchaSecretKey || !captchaSiteKey) {
        return NextResponse.json({ error: 'captcha_config_missing' }, { status: 400 })
      }

      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: captchaSecretKey,
          response: String(captchaToken)
        })
      })

      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyData?.success) {
        return NextResponse.json({ error: 'captcha_failed', reason: 'recaptcha' }, { status: 400 })
      }
    }

    const [existingUser, existingEmail] = await Promise.all([
      prismaClient.user.findUnique({ where: { username }, select: { id: true } }),
      prismaClient.user.findFirst({ where: { email }, select: { id: true } })
    ])
    if (existingUser) {
      return NextResponse.json({ error: 'username_exists' }, { status: 409 })
    }
    if (existingEmail) {
      return NextResponse.json({ error: 'email_exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prismaClient.user.create({
      data: {
        id: randomUUID(),
        username,
        email,
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE',
        updatedAt: new Date(),
        ...(fullName
          ? {
              displayName: fullName,
              nickname: fullName
            }
          : {})
      }
    })

    await createLog(
      user.username,
      'สมัครสมาชิก',
      'USER',
      undefined,
      user.id
    )

    let emailSent = false
    try {
      const token = generateToken()
      const tokenHash = hashToken(token)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prismaClient.emailverificationtoken.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          email,
          tokenHash,
          expiresAt
        }
      })
      const siteName = await getSiteName()
      await sendVerificationEmail(email, token, siteName)
      emailSent = true
    } catch (err) {
      console.error('Failed to send verification email:', err)
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error as { meta?: { target?: unknown } }).meta?.target
      if (Array.isArray(target) && target.includes('User_email_key')) {
        return NextResponse.json({ error: 'email_exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'username_exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'server_error', detail: String(error) }, { status: 500 })
  }
}
