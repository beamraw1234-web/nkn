import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// POST /api/broadcast/message - Send a broadcast chat message and create notifications
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, nickname: true, id: true }
    })

    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all other users (to send them notifications)
    const allUsers = await prisma.user.findMany({
      where: {
        id: {
          not: session.user.id
        }
      },
      select: { id: true }
    })

    // Create notifications for all other users
    const notificationPromises = allUsers.map(user =>
      prisma.notification.create({
        data: {
          id: randomBytes(16).toString('hex'),
          userId: user.id,
          type: 'BROADCAST_MESSAGE',
          title: 'ข้อความแชทใหม่',
          message: `${sender.nickname || sender.username}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
          meta: {
            senderId: session.user.id,
            senderUsername: sender.username,
            senderNickname: sender.nickname,
            messagePreview: message.substring(0, 100)
          }
        }
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending broadcast message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
