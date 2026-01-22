import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'

export async function GET(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })

    const file = await prisma.file.findUnique({ where: { id }, include: { category: true, filehidden: true } })
    if (!file) return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 })

    // Check if hidden and user is not admin
    if (file.isHidden && session.user.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 })
    }

    // Check password if set
    if (file.password) {
      const url = new URL(req.url)
      const providedPassword = url.searchParams.get('password')
      if (!providedPassword || !bcrypt.compareSync(providedPassword, file.password)) {
        return NextResponse.json({ ok: false, message: 'password_required' }, { status: 403 })
      }
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', file.storageKey)
    if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, message: 'file_not_found' }, { status: 404 })

    const fileBuffer = fs.readFileSync(filePath)
    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': file.mime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
    })
    return response
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'get_error', detail: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })

    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    const body = await req.json()
    const update: any = {}
    if (body.name) update.name = body.name
    if (typeof body.categoryId !== 'undefined') update.categoryId = body.categoryId || null
    if (typeof body.isHidden !== 'undefined') update.isHidden = Boolean(body.isHidden)
    if (typeof body.expiresAt !== 'undefined') update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (typeof body.priceSatang !== 'undefined') {
      const n = Number(body.priceSatang)
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ ok: false, message: 'invalid_price' }, { status: 400 })
      update.priceSatang = Math.floor(n)
    }
    if (typeof body.password !== 'undefined') {
      if (body.password) {
        const salt = bcrypt.genSaltSync(10)
        update.password = bcrypt.hashSync(body.password, salt)
      } else {
        update.password = null
      }
    }

    update.updatedAt = new Date()

    const rec = await prisma.file.update({ where: { id }, data: update })
    return NextResponse.json({ ok: true, file: rec })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'update_error', detail: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })

    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    const file = await prisma.file.findUnique({ where: { id } })
    if (!file) return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 })

    const filePath = path.join(process.cwd(), 'public', 'uploads', file.storageKey)
    try { fs.unlinkSync(filePath) } catch (e) {}

    await prisma.file.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'delete_error', detail: String(e) }, { status: 500 })
  }
}
