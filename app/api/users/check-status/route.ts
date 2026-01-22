import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const username = url.searchParams.get('username')

    if (!username) return NextResponse.json({ ok: false, message: 'missing_username' }, { status: 400 })

    let user: { status?: string | null } | null = null
    try {
      user = await prisma.user.findUnique({
        where: { username }
      })
    } catch (e) {
      const err = e as { message?: string; stack?: string }
      console.error('GET /api/users/check-status db error:', err?.message ?? err)
      console.debug('GET /api/users/check-status db stack:', err?.stack ?? 'no-stack')
      return NextResponse.json({ ok: true, status: 'ACTIVE' })
    }

    if (!user) return NextResponse.json({ ok: true, status: 'NOT_FOUND' })

    return NextResponse.json({ ok: true, status: String(user.status || 'ACTIVE').toUpperCase() })
  } catch (e) {
    const err = e as { message?: string; stack?: string }
    console.error('GET /api/users/check-status failed:', err?.message ?? err)
    console.debug('GET /api/users/check-status stack:', err?.stack ?? 'no-stack')
    return NextResponse.json({ ok: false, message: 'server_error' }, { status: 500 })
  }
}
