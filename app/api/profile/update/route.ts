import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/authOptions'

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
    }

    const { nickname } = await req.json()

    if (typeof nickname !== 'string' || nickname.length > 50) {
      return NextResponse.json({ error: 'ชื่อเล่นไม่ถูกต้อง' }, { status: 400 })
    }

    // Update user nickname
    await prisma.user.update({
      where: { id: session.user.id },
      data: { nickname: nickname.trim() || null } as any
    })

    return NextResponse.json({
      success: true,
      message: 'อัปเดตชื่อเล่นสำเร็จ'
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'อัปเดตล้มเหลว' }, { status: 500 })
  }
}