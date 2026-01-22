import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/authOptions'

// Update username (English, numbers, underscore; <= 10 chars; unique)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user
    const userId = sessionUser?.id ? String(sessionUser.id) : null
    if (!userId) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
    }

    const { username } = await req.json()
    const trimmed = typeof username === 'string' ? username.trim() : ''

    if (!trimmed) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้' }, { status: 400 })
    }
    if (trimmed.length > 10) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องไม่เกิน 10 ตัวอักษร' }, { status: 400 })
    }
    if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'ใช้ได้เฉพาะตัวอักษรอังกฤษ เลข หรือ _ เท่านั้น' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: trimmed,
        ...(userId ? { NOT: { id: userId } } : {})
      },
      select: { id: true }
    })

    if (existing) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }, { status: 409 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { username: trimmed }
    })

    return NextResponse.json({ success: true, message: 'อัปเดตชื่อผู้ใช้สำเร็จ' })
  } catch (error) {
    console.error('Update username error:', error)
    return NextResponse.json({ error: 'อัปเดตล้มเหลว' }, { status: 500 })
  }
}
