import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    const body = await req.json()
    const { userId, hidden } = body
    if (!userId) return NextResponse.json({ ok: false, message: 'missing_userId' }, { status: 400 })

    // Upsert hidden record for user
    const existing = await prisma.filehidden.findFirst({ where: { fileId: id, userId } })
    if (existing) {
      const rec = await prisma.filehidden.update({ where: { id: existing.id }, data: { hidden: !!hidden } })
      return NextResponse.json({ ok: true, hidden: rec.hidden })
    } else {
      const rec = await prisma.filehidden.create({ data: { id: randomUUID(), fileId: id, userId, hidden: !!hidden } })
      return NextResponse.json({ ok: true, hidden: rec.hidden })
    }
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'hide_error', detail: String(e) }, { status: 500 })
  }
}
