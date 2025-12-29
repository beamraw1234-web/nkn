import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    const files = await prisma.file.findMany({
      where: isAdmin ? {} : { isHidden: false },
      select: {
        id: true,
        name: true,
        mime: true,
        size: true,
        category: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        isHidden: isAdmin ? true : false
      }
    })
    return NextResponse.json(files)
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'list_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, base64, mime, size, categoryId, password, isHidden, createdBy } = body

    if (!name || !base64) return NextResponse.json({ ok: false, message: 'missing_fields' }, { status: 400 })

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    const ext = (mime && mime.split('/')[1]) ? `.${mime.split('/')[1]}` : path.extname(name) || ''
    const storageKey = `${uuidv4()}${ext}`
    const filePath = path.join(uploadsDir, storageKey)

    // base64 may include data:...;base64, prefix
    const commaIdx = base64.indexOf(',')
    const raw = commaIdx !== -1 ? base64.slice(commaIdx + 1) : base64
    const buf = Buffer.from(raw, 'base64')

    fs.writeFileSync(filePath, buf)

    const rec = await prisma.file.create({
      data: {
        name,
        storageKey,
        mime: mime || 'application/octet-stream',
        size: size || buf.length,
        categoryId: categoryId || null,
        password: password || null,
        isHidden: isHidden || false,
        createdBy: createdBy || null
      }
    })

    return NextResponse.json({ ok: true, file: rec })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'upload_error', detail: String(e) }, { status: 500 })
  }
}
