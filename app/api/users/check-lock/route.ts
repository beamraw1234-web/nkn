import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const username = url.searchParams.get('username')

    if (!username) return NextResponse.json({ ok: false, message: 'missing_username' }, { status: 400 })

    let user: any = null
    try {
      user = await prisma.user.findUnique({ where: { username } })
    } catch (e) {
      const err: any = e
      console.error('GET /api/users/check-lock db error:', err?.message ?? err)
      console.debug('GET /api/users/check-lock db stack:', err?.stack ?? 'no-stack')
      // Return not locked if db is down, to allow login
      return NextResponse.json({ ok: true, locked: false })
    }

    if (!user) return NextResponse.json({ ok: true, locked: false })

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json({ ok: true, locked: true, minutesLeft, message: `บัญชีถูกระงับชั่วคราว กรุณาลองใหม่ใน ${minutesLeft} นาที` })
    }

    return NextResponse.json({ ok: true, locked: false })
  } catch (e) {
    const err: any = e
    console.error('GET /api/users/check-lock failed:', err?.message ?? err)
    console.debug('GET /api/users/check-lock stack:', err?.stack ?? 'no-stack')
    return NextResponse.json({ ok: false, message: 'server_error' }, { status: 500 })
  }
}
