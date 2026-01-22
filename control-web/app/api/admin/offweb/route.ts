import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminToken } from '@/lib/adminAuth'

async function getOffwebRow() {
  return prisma.offweb.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      isOff: false,
      message: 'ปิดปรับปรุงระบบ',
      updatedAt: new Date()
    }
  })
}

export async function GET(req: Request) {
  if (!requireAdminToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const row = await getOffwebRow()
  return NextResponse.json({ isOff: row.isOff, message: row.message, updatedAt: row.updatedAt })
}

export async function PUT(req: Request) {
  if (!requireAdminToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const isOff = Boolean(body?.isOff)
    const message = String(body?.message || '').slice(0, 2000)
    const updated = await prisma.offweb.upsert({
      where: { id: 'global' },
      update: { isOff, message },
      create: { id: 'global', isOff, message, updatedAt: new Date() }
    })
    return NextResponse.json({ isOff: updated.isOff, message: updated.message, updatedAt: updated.updatedAt })
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

