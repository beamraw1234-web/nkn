import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/authOptions'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'profile' or 'cover'

    if (!file || !type) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP)' }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ขนาดไฟล์ต้องน้อยกว่า 5MB' }, { status: 400 })
    }

    // Validate minimum size (1KB)
    if (file.size < 1024) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพมีขนาดเล็กเกินไป' }, { status: 400 })
    }

    // Generate unique filename with timestamp and random string
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.type.split('/')[1] // Use mime type extension
    const fileName = `${session.user.id}_${type}_${timestamp}_${randomId}.${fileExtension}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create uploads directory:', error)
      return NextResponse.json({ error: 'ไม่สามารถสร้างโฟลเดอร์ได้' }, { status: 500 })
    }

    try {
      // Save file
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Update user in database
      const publicPath = `/uploads/profiles/${fileName}`
      const updateData = type === 'profile'
        ? { profilePicture: publicPath }
        : { coverImage: publicPath }

      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData
      })

      return NextResponse.json({
        success: true,
        path: publicPath,
        message: `${type === 'profile' ? 'รูปโปรไฟล์' : 'รูปหน้าปก'} อัปโหลดสำเร็จ`
      })
    } catch (error) {
      console.error('File save error:', error)
      return NextResponse.json({ error: 'ไม่สามารถบันทึกไฟล์ได้' }, { status: 500 })
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}