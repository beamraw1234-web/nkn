import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

// POST /api/chat/online-status - Check online status of multiple users
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userIds } = await req.json()

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 })
    }

    // Check online status for each user
    // A user is considered online if they've been active in the last 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    
    const status: Record<string, boolean> = {}
    
    for (const userId of userIds) {
      const key = `last_activity_${userId}`
      const activity = await prisma.systemsettings.findUnique({
        where: { key }
      })
      
      if (activity) {
        const lastActivity = new Date(activity.value)
        status[userId] = lastActivity > oneMinuteAgo
      } else {
        status[userId] = false
      }
    }

    return NextResponse.json({ status })
  } catch (error) {
    console.error('Error checking online status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
