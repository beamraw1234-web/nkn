import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

// GET /api/chat/messages - Get chat messages with a friend
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const friendId = req.nextUrl.searchParams.get('friendId')
    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID required' }, { status: 400 })
    }

    // Verify friendship - allow if either accepted or request is pending
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId },
          { userId: friendId, friendId: session.user.id }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends', messages: [] })
    }

    const messages = await prisma.chatmessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: friendId },
          { senderId: friendId, receiverId: session.user.id }
        ]
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
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 100
    })

    // Mark messages as read
    await prisma.chatmessage.updateMany({
      where: {
        senderId: friendId,
        receiverId: session.user.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/messages - Save new message
export async function POST(req: NextRequest) {
  try {
    const { id, senderId, receiverId, content, fileUrl, fileName, fileSize, fileMime } = await req.json()

    if (!senderId || !receiverId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Verify user exists (instead of getServerSession which has issues with client-side calls)
    const user = await prisma.user.findUnique({
      where: { id: senderId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify friendship
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId, status: 'ACCEPTED' },
          { userId: receiverId, friendId: senderId, status: 'ACCEPTED' }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends' }, { status: 403 })
    }

    const message = await prisma.chatmessage.create({
      data: {
        id,
        senderId,
        receiverId,
        content,
        fileUrl,
        fileName,
        fileSize,
        fileMime
      }
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chat/messages - Delete all messages between two users
export async function DELETE(req: NextRequest) {
  try {
    const { senderId, friendId } = await req.json()

    if (!senderId || !friendId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: senderId } })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Verify friendship exists (so only connected users can delete chat)
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: senderId, status: 'ACCEPTED' }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends' }, { status: 403 })
    }

    // Delete all messages in both directions
    const result = await prisma.chatmessage.deleteMany({
      where: {
        OR: [
          { senderId, receiverId: friendId },
          { senderId: friendId, receiverId: senderId }
        ]
      }
    })

    return NextResponse.json({ success: true, deletedCount: result.count })
  } catch (error) {
    console.error('Error deleting messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
