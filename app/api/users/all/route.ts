import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

// GET /api/users/all - Get all users (for friend search)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.warn('users/all unauthorized: missing session', {
        cookies: req.headers.get('cookie') ?? 'none'
      })
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const search = (req.nextUrl.searchParams.get('search') || '').trim()

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } }, // Exclude self
          { status: 'ACTIVE' }, // Only active users
          search ? {
            OR: [
              { username: { contains: search } },
              { nickname: { contains: search } },
              { displayName: { contains: search } }
            ]
          } : {}
        ]
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        nickname: true,
        profilePicture: true,
        role: true
      },
      take: 50
    })

    // Get friendship status for each user
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { friendId: session.user.id }
        ]
      }
    })

    const usersWithStatus = users.map(user => {
      const friendship = friendships.find(f => 
        f.userId === user.id || f.friendId === user.id
      )
      
      let friendshipStatus = 'none'
      if (friendship) {
        if (friendship.status === 'ACCEPTED') {
          friendshipStatus = 'friend'
        } else if (friendship.userId === session.user.id) {
          friendshipStatus = 'sent'
        } else {
          friendshipStatus = 'received'
        }
      }

      return {
        ...user,
        friendshipStatus,
        friendshipId: friendship?.id
      }
    })

    return NextResponse.json({ users: usersWithStatus })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
