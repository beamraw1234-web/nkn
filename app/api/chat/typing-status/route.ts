import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

// GET /api/chat/typing-status?friendId=xxx - Check if friend is typing
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const friendId = searchParams.get('friendId')

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 })
    }

    // Check if friend is typing to current user
    const key = `typing_${friendId}_to_${session.user.id}`
    const typingStatus = await prisma.systemsettings.findUnique({
      where: { key }
    })

    if (typingStatus) {
      const typingTime = new Date(typingStatus.value)
      const now = new Date()
      const diff = now.getTime() - typingTime.getTime()
      
      // Typing status expires after 3 seconds
      if (diff < 3000) {
        return NextResponse.json({ isTyping: true })
      } else {
        // Cleanup old typing status
        await prisma.systemsettings.deleteMany({ where: { key } })
      }
    }

    return NextResponse.json({ isTyping: false })
  } catch (error) {
    console.error('Error checking typing status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
