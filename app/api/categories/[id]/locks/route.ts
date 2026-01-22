import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { randomUUID } from 'crypto'

export async function GET(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })

    const p = (params instanceof Promise) ? await params : params
    const categoryId = p.id

    const locks = await prisma.categorylock.findMany({
      where: { categoryId },
      include: { user: { select: { id: true, username: true } } }
    })

    return NextResponse.json({ ok: true, locks })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'get_locks_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })

    const p = (params instanceof Promise) ? await params : params
    const categoryId = p.id
    const { userId, locked } = await req.json()

    if (locked) {
      await prisma.categorylock.upsert({
        where: { userId_categoryId: { userId, categoryId } },
        update: { locked: true },
        create: { id: randomUUID(), userId, categoryId, locked: true }
      })
    } else {
      await prisma.categorylock.deleteMany({
        where: { userId, categoryId }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'update_lock_error', detail: String(e) }, { status: 500 })
  }
}
