import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { io } from 'socket.io-client'

// Connect to socket server for emitting events
let socketClient: ReturnType<typeof io> | null = null
function getSocketClient() {
  if (!socketClient) {
    socketClient = io('http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })
  }
  return socketClient
}

// POST /api/chat/send - Send a chat message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiverId, content } = await req.json()

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (receiverId === session.user.id) {
      return NextResponse.json({ error: 'Cannot send message to yourself' }, { status: 400 })
    }

    // Create chat message
    const message = await prisma.chatmessage.create({
      data: {
        id: randomBytes(16).toString('hex'),
        senderId: session.user.id,
        receiverId,
        content,
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profilePicture: true
          }
        }
      }
    })

    // Get sender info for notification
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, nickname: true }
    })

    // Create notification for the recipient
    await prisma.notification.create({
      data: {
        id: randomBytes(16).toString('hex'),
        userId: receiverId,
        type: 'CHAT_MESSAGE',
        title: 'ข้อความใหม่',
        message: `${sender?.nickname || sender?.username}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        meta: {
          chatMessageId: message.id,
          senderId: session.user.id,
          senderUsername: sender?.username,
          senderNickname: sender?.nickname
        }
      }
    })

    // Emit socket event to notify receiver in real-time
    try {
      const socket = getSocketClient()
      const roomId = [session.user.id, receiverId].sort().join('_')
      socket.emit('chat:private:message', {
        senderId: session.user.id,
        receiverId,
        messageId: message.id,
        content: message.content,
        timestamp: message.createdAt
      })
    } catch (socketError) {
      console.error('Socket emit error:', socketError)
      // Continue even if socket fails
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Error sending chat message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
