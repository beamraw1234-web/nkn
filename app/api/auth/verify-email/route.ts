import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/tokens'

const prismaClient = prisma as unknown as {
  emailverificationtoken: typeof prisma.emailverificationtoken
  user: typeof prisma.user
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = String(searchParams.get('token') || '').trim()

    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const tokenHash = hashToken(token)
    const record = await prismaClient.emailverificationtoken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, email: true, expiresAt: true, usedAt: true }
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    await prismaClient.user.update({
      where: { id: record.userId },
      data: {
        email: record.email,
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      }
    })

    await prismaClient.emailverificationtoken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('GET /api/auth/verify-email failed:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
