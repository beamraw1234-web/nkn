import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { publishBroadcast } from '@/lib/broadcast'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const levelRaw = typeof body?.level === 'string' ? body.level.trim() : ''
    const level = (['info', 'success', 'warning', 'error'] as const).includes(levelRaw as 'info' | 'success' | 'warning' | 'error')
      ? (levelRaw as 'info' | 'success' | 'warning' | 'error')
      : 'info'

    const durationMsRaw = body?.durationMs
    const durationMsNum = typeof durationMsRaw === 'number' && Number.isFinite(durationMsRaw) ? durationMsRaw : 6000
    const durationMs = Math.min(Math.max(Math.floor(durationMsNum), 2000), 20000)

    if (!message) {
      return NextResponse.json({ error: 'missing_message' }, { status: 400 })
    }

    publishBroadcast({
      id: randomUUID(),
      type: 'ADMIN_ANNOUNCEMENT',
      title: title || 'ประกาศจากแอดมิน',
      message,
      meta: { level, durationMs },
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to broadcast' }, { status: 500 })
  }
}
