import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminToken } from '@/lib/adminAuth'

export async function PATCH(req: Request, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  if (!requireAdminToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = (ctx.params instanceof Promise) ? await ctx.params : ctx.params
  const { id } = p
  try {
    const body = await req.json()
    const data: { isActive?: boolean; name?: string } = {}
    if (typeof body?.isActive !== 'undefined') data.isActive = Boolean(body.isActive)
    if (typeof body?.name !== 'undefined') data.name = String(body.name || '').trim().slice(0, 120)
    const updated = await prisma.apikey.update({ where: { id }, data })
    return NextResponse.json({ key: updated })
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

export async function DELETE(req: Request, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  if (!requireAdminToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = (ctx.params instanceof Promise) ? await ctx.params : ctx.params
  const { id } = p
  try {
    await prisma.apikey.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

