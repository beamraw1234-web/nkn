import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/tokens'
import bcrypt from 'bcryptjs'

const prismaClient = prisma as unknown as {
  passwordresettoken: typeof prisma.passwordresettoken
  user: typeof prisma.user
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = String(body?.token || '').trim()
    const password = String(body?.password || '')

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const tokenHash = hashToken(token)
    const record = await prismaClient.passwordresettoken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true }
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prismaClient.user.update({
      where: { id: record.userId },
      data: {
        password: hashedPassword,
        tokensInvalidBefore: new Date(),
        updatedAt: new Date()
      }
    })

    await prismaClient.passwordresettoken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/auth/reset-password failed:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
