import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
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

// POST /api/chat/typing - Update typing status
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { friendId, receiverId, isTyping } = await req.json()
    const targetId = friendId || receiverId

    if (!targetId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 })
    }

    // Store typing status in database with timestamp (for cleanup)
    const key = `typing_${session.user.id}_to_${targetId}`
    
    if (isTyping) {
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
    } else {
      // Remove typing status
      await prisma.systemsettings.deleteMany({
        where: { key }
      })
    }

    // Emit socket event for real-time typing indicator
    try {
      const socket = getSocketClient()
      socket.emit('chat:private:typing', {
        senderId: session.user.id,
        receiverId: targetId,
        isTyping
      })
    } catch (socketError) {
      console.error('Socket emit error:', socketError)
      // Continue even if socket fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating typing status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
