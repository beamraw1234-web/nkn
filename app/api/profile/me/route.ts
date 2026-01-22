import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/authOptions'

const prismaClient = prisma as unknown as { user: typeof prisma.user }

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user
    const userId = sessionUser?.id ? String(sessionUser.id) : null
    if (!userId) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
    }

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        nickname: true,
        studentId: true,
        email: true,
        emailVerifiedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: 'โหลดข้อมูลล้มเหลว' }, { status: 500 })
  }
}
