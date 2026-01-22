import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GET /api/friends/requests - Get friend requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requests = await prisma.friendship.findMany({
      where: {
        friendId: session.user.id,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profilePicture: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching friend requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/friends/requests - Send friend request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { friendId } = await req.json()

    if (!friendId || friendId === session.user.id) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 })
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId },
          { userId: friendId, friendId: session.user.id }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 })
    }

    // Get sender info for notification
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, nickname: true }
    })

    const friendship = await prisma.friendship.create({
      data: {
        id: randomBytes(16).toString('hex'),
        userId: session.user.id,
        friendId,
        status: 'PENDING'
      }
    })

    // Create notification for the recipient
    await prisma.notification.create({
      data: {
        id: randomBytes(16).toString('hex'),
        userId: friendId,
        type: 'FRIEND_REQUEST',
        title: 'คำขอเพื่อนใหม่',
        message: `${sender?.nickname || sender?.username} ได้ส่งคำขอเพื่อนมาให้คุณ`,
        meta: {
          friendshipId: friendship.id,
          senderId: session.user.id,
          senderUsername: sender?.username
        }
      }
    })

    return NextResponse.json({ success: true, friendship })
  } catch (error) {
    console.error('Error sending friend request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
