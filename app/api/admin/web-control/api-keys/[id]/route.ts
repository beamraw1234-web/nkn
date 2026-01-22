import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { createLog } from '@/lib/log'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function PATCH(req: Request, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p = (ctx.params instanceof Promise) ? await ctx.params : ctx.params
  const { id } = p
  try {
    const body = await req.json()
    const data: { isActive?: boolean; name?: string } = {}

    if (typeof body?.isActive !== 'undefined') data.isActive = Boolean(body.isActive)
    if (typeof body?.name !== 'undefined') data.name = String(body.name || '').trim().slice(0, 120)

    const updated = await prisma.apikey.update({
      where: { id },
      data
    })

    await createLog(
      session.user.name || 'Admin',
      'แก้ไข API Key',
      'ADMIN',
      `แก้ไขคีย์ (${updated.apiKeyPrefix})`,
      session.user.id
    )

    return NextResponse.json({
      key: {
        id: updated.id,
        name: updated.name,
        apiKeyPrefix: updated.apiKeyPrefix,
        isActive: updated.isActive,
        lastSeen: updated.lastSeen,
        lastIp: updated.lastIp,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    })
  } catch (error) {
    console.error('PATCH /api/admin/web-control/api-keys/[id] failed:', error)
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p = (ctx.params instanceof Promise) ? await ctx.params : ctx.params
  const { id } = p
  try {
    const deleted = await prisma.apikey.delete({ where: { id } })

    await createLog(
      session.user.name || 'Admin',
      'ลบ API Key',
      'ADMIN',
      `ลบคีย์ (${deleted.apiKeyPrefix})`,
      session.user.id
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/admin/web-control/api-keys/[id] failed:', error)
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}
