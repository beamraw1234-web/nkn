import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'

export async function GET() {
  try {
    const [contentSetting, iconSetting, colorSetting, speedSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: 'admin_announcement' } }),
      prisma.systemSettings.findUnique({ where: { key: 'admin_announcement_icon' } }),
      prisma.systemSettings.findUnique({ where: { key: 'admin_announcement_color' } }),
      prisma.systemSettings.findUnique({ where: { key: 'admin_announcement_speed' } })
    ])
    
    return NextResponse.json({ 
      content: contentSetting?.value || '',
      icon: iconSetting?.value || 'Megaphone',
      color: colorSetting?.value || '#06b6d4', // Default cyan
      speed: parseInt(speedSetting?.value || '20'), // Default duration 20s
      enabled: true 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, icon, color, speed } = await req.json()

    await prisma.systemSettings.upsert({
      where: { key: 'admin_announcement' },
      update: { value: content },
      create: { key: 'admin_announcement', value: content }
    })

    if (icon) {
      await prisma.systemSettings.upsert({
        where: { key: 'admin_announcement_icon' },
        update: { value: icon },
        create: { key: 'admin_announcement_icon', value: icon }
      })
    }

    if (color) {
      await prisma.systemSettings.upsert({
        where: { key: 'admin_announcement_color' },
        update: { value: color },
        create: { key: 'admin_announcement_color', value: color }
      })
    }

    if (speed) {
      await prisma.systemSettings.upsert({
        where: { key: 'admin_announcement_speed' },
        update: { value: speed.toString() },
        create: { key: 'admin_announcement_speed', value: speed.toString() }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save announcement' }, { status: 500 })
  }
}
