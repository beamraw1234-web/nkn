import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cleanup: keep login-alert notifications only for a short window.
    // This prevents stale security prompts from lingering.
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      await prisma.notification.deleteMany({
        where: {
          userId: session.user.id,
          type: 'LOGIN_ALERT',
          createdAt: { lt: fiveMinutesAgo },
        },
      })
    } catch {
      // best-effort
    }

    const { searchParams } = new URL(req.url)
    const take = Math.min(parseInt(searchParams.get('take') || '30', 10) || 30, 100)

    const items = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        meta: true,
        createdAt: true,
        readAt: true,
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    })

    return NextResponse.json({ items, unreadCount })
  } catch (error) {
    console.error('GET /api/notifications failed:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    const markAll = body?.markAll === true

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, readAt: null },
        data: { readAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 })
    }

    const updated = await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { readAt: new Date() },
    })

    if (!updated.count) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/notifications failed:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
