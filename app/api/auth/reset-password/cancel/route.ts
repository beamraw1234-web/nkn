import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/tokens'

const prismaClient = prisma as unknown as {
  passwordresettoken: typeof prisma.passwordresettoken
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = String(searchParams.get('token') || '').trim()
    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const tokenHash = hashToken(token)
    const record = await prismaClient.passwordresettoken.findUnique({
      where: { tokenHash },
      select: { id: true, usedAt: true, expiresAt: true }
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ ok: true })
    }

    await prismaClient.passwordresettoken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('GET /api/auth/reset-password/cancel failed:', error)
    return NextResponse.json({ ok: true })
  }
}
