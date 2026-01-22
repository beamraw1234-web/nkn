import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// POST /api/chat/upload - Upload file for chat
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const friendId = formData.get('friendId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID required' }, { status: 400 })
    }

    // Verify friendship
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: session.user.id, status: 'ACCEPTED' }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends' }, { status: 403 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = randomBytes(8).toString('hex')
    const ext = file.name.split('.').pop()
    const filename = `chat_${timestamp}_${random}.${ext}`

    // Save file
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat')
    await mkdir(uploadDir, { recursive: true })
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/chat/${filename}`

    return NextResponse.json({
      success: true,
      file: {
        url: fileUrl,
        name: file.name,
        size: file.size,
        mime: file.type
      }
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
