import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/authOptions'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP)' }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ขนาดไฟล์ต้องน้อยกว่า 5MB' }, { status: 400 })
    }

    // Validate minimum size (1KB)
    if (file.size < 1024) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพมีขนาดเล็กเกินไป' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.type.split('/')[1]
    const fileName = `${timestamp}_${randomId}.${fileExtension}`

    // Create uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
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

      const publicPath = `/uploads/${fileName}`

      return NextResponse.json({
        success: true,
        url: publicPath,
        path: publicPath,
        message: 'อัปโหลดสำเร็จ'
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
