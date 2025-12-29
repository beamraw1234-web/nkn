import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { createLog } from '@/lib/log'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username, password, role, status } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { username }
  })

  if (existingUser) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: role || 'USER',
      status: status || 'ACTIVE'
    }
  })

  await createLog(
    session.user.name || 'Admin',
    'สร้างผู้ใช้',
    'ADMIN',
    `สร้างผู้ใช้ใหม่ ${user.username} (Role: ${user.role})`,
    session.user.id
  )

  return NextResponse.json(user)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
    }
  })

  return NextResponse.json(users)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, status, role, username } = await req.json()

  const user = await prisma.user.update({
    where: { id },
    data: { status, role, username }
  })

  await createLog(
    session.user.name || 'Admin',
    'แก้ไขผู้ใช้',
    'ADMIN',
    `แก้ไขข้อมูลของ ${user.username} (Status: ${status}, Role: ${role})`,
    session.user.id
  )

  return NextResponse.json(user)
}

export async function DELETE(req: Request) {
    try {
      const session = await getServerSession(authOptions)
    
      if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')

      if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

      const user = await prisma.user.delete({ where: { id } })

      await createLog(
        session.user.name || 'Admin',
        'ลบผู้ใช้',
        'ADMIN',
        `ลบผู้ใช้ ${user.username}`,
        session.user.id
      )

      return NextResponse.json({ success: true })
    } catch (e) {
      return NextResponse.json({ error: 'Delete failed', detail: String(e) }, { status: 500 })
    }
}
