import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { createLog } from '@/lib/log'

function mapUrl(lat?: number | null, lon?: number | null) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const rec = await prisma.loginalerttoken.findUnique({
      where: { token },
    })

    if (!rec) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
    }

    if (rec.usedAt) {
      return NextResponse.json({ error: 'token_used' }, { status: 400 })
    }

    if (rec.expiresAt < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.loginalerttoken.update({
        where: { token },
        data: { usedAt: new Date() },
      })

      await tx.user.update({
        where: { id: rec.userId },
        data: {
          forcePasswordChange: true,
          forcePasswordChangeAt: new Date(),
          forcePasswordChangeReason: `มีการกด “ไม่ใช่ฉัน” สำหรับการเข้าสู่ระบบจาก IP ${rec.ip || 'unknown'} ระบบจึงบังคับให้เปลี่ยนรหัสผ่านเพื่อความปลอดภัย`,
          forcePasswordChangeMeta: {
            ip: rec.ip || null,
            userAgent: rec.userAgent || null,
            country: rec.country || null,
            region: rec.region || null,
            city: rec.city || null,
            latitude: rec.latitude ?? null,
            longitude: rec.longitude ?? null,
            mapUrl: mapUrl(rec.latitude ?? null, rec.longitude ?? null),
          },
          tokensInvalidBefore: new Date(),
          updatedAt: new Date(),
        },
      })

      // Optional: audit trail via existing log model.
      await tx.log.create({
        data: {
          id: randomUUID(),
          userId: rec.userId,
          username: 'system',
          action: 'Login Alert',
          role: 'SYSTEM',
          details: `ผู้ใช้กด “ไม่ใช่ฉัน” สำหรับล็อกอินจาก IP ${rec.ip || 'unknown'} — บังคับเปลี่ยนรหัสผ่านและรีโวคเซสชัน`,
          ip: rec.ip || null,
          userAgent: rec.userAgent || null,
        },
      })
    })

    // Also log using helper (best-effort, doesn't fail request)
    try {
      await createLog('system', 'Login Alert', 'SYSTEM', `กด “ไม่ใช่ฉัน” (userId=${rec.userId})`)
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/login-alert/not-me failed:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
