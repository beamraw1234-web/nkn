import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    const body = await req.json()
    const update: any = {}
    if (body.name) update.name = body.name
    if (typeof body.visible !== 'undefined') update.visible = Boolean(body.visible)
    if (body.slug) update.slug = body.slug

    const rec = await prisma.category.update({ where: { id }, data: update })
    return NextResponse.json({ ok: true, category: rec })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'cat_update_error', detail: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    // detach files first
    await prisma.file.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'cat_delete_error', detail: String(e) }, { status: 500 })
  }
}
