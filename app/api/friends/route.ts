import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

// GET /api/friends - Get friends list
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: session.user.id, status: 'ACCEPTED' },
          { friendId: session.user.id, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profilePicture: true,
            status: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profilePicture: true,
            status: true
          }
        }
      }
    })

    const friends = friendships.map(f => {
      const isFriend = f.userId === session.user.id
      const friendUser = isFriend ? f.friend : f.user
      return {
        ...friendUser,
        friendshipId: f.id
      }
    })

    return NextResponse.json({ friends })
  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
