import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

// POST /api/chat/heartbeat - Update user's last activity
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update last activity timestamp
    const key = `last_activity_${session.user.id}`
    const now = new Date()
    await prisma.systemsettings.upsert({
      where: { key },
      update: { value: now.toISOString(), updatedAt: now },
      create: { 
        id: uuidv4(),
        key, 
        value: now.toISOString(),
        updatedAt: now
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating heartbeat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
