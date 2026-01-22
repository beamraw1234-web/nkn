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

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await getOffwebRow()
  return NextResponse.json({
    isOff: row.isOff,
    message: row.message,
    updatedAt: row.updatedAt
  })
}

export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const isOff = Boolean(body?.isOff)
    const message = String(body?.message || '').slice(0, 2000)

    const updated = await prisma.offweb.upsert({
      where: { id: 'global' },
      update: { isOff, message },
      create: { id: 'global', isOff, message, updatedAt: new Date() }
    })

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขสถานะเว็บไซต์',
      'ADMIN',
      `${isOff ? 'ปิดเว็บ' : 'เปิดเว็บ'}${message ? `: ${message}` : ''}`,
      session.user.id
    )

    return NextResponse.json({
      isOff: updated.isOff,
      message: updated.message,
      updatedAt: updated.updatedAt
    })
  } catch (error) {
    console.error('PUT /api/admin/web-control/offweb failed:', error)
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

