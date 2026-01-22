import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production',
      cookieName: 'next-auth.session-token'
    })
    if (!token) {
      return NextResponse.json({ valid: false, reason: 'no_token' }, { status: 200 })
    }

    const userId = (token as Record<string, unknown>).id || (token as Record<string, unknown>).sub
    if (!userId) {
      return NextResponse.json({ valid: false, reason: 'no_user' }, { status: 200 })
    }

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        forcePasswordChange: true,
        forcePasswordChangeAt: true,
        forcePasswordChangeReason: true,
        forcePasswordChangeMeta: true,
        tokensInvalidBefore: true,
      },
    })

    if (!user) {
      return NextResponse.json({ valid: false, reason: 'user_not_found' }, { status: 200 })
    }

    const iatValue = (token as Record<string, unknown>).iat
    const iat = typeof iatValue === 'number' ? iatValue : null
    if (user.tokensInvalidBefore && typeof iat === 'number') {
      const tokenTime = iat * 1000
      if (tokenTime < user.tokensInvalidBefore.getTime()) {
        return NextResponse.json({ valid: false, reason: 'revoked' }, { status: 200 })
      }
    }

    return NextResponse.json(
      {
        valid: true,
        user: {
          id: user.id
        },
        forcePasswordChange: user.forcePasswordChange,
        forcePasswordChangeAt: user.forcePasswordChangeAt,
        forcePasswordChangeReason: user.forcePasswordChangeReason,
        forcePasswordChangeMeta: user.forcePasswordChangeMeta,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/auth/validate failed:', error)
    // Fail open to avoid locking users out if DB has issues.
    return NextResponse.json({ valid: true, forcePasswordChange: false, degraded: true }, { status: 200 })
  }
}
