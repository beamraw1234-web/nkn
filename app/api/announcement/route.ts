import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { randomUUID } from 'crypto'

function getSettingsDelegate() {
  const prismaAny = prisma as unknown as { systemSettings?: typeof prisma.systemsettings; systemsettings?: typeof prisma.systemsettings }
  const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
  if (!systemSettings) {
    throw new Error('Prisma model delegate for SystemSettings not found')
  }
  return systemSettings
}

export async function GET() {
  try {
    const systemSettings = getSettingsDelegate()
    const [contentSetting, iconSetting, colorSetting, speedSetting] = await Promise.all([
      systemSettings.findUnique({ where: { key: 'admin_announcement' } }),
      systemSettings.findUnique({ where: { key: 'admin_announcement_icon' } }),
      systemSettings.findUnique({ where: { key: 'admin_announcement_color' } }),
      systemSettings.findUnique({ where: { key: 'admin_announcement_speed' } })
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
    const now = new Date()
    const systemSettings = getSettingsDelegate()

    await systemSettings.upsert({
      where: { key: 'admin_announcement' },
      update: { value: content, updatedAt: now },
      create: { id: randomUUID(), key: 'admin_announcement', value: content, updatedAt: now }
    })

    if (icon) {
      await systemSettings.upsert({
        where: { key: 'admin_announcement_icon' },
        update: { value: icon, updatedAt: now },
        create: { id: randomUUID(), key: 'admin_announcement_icon', value: icon, updatedAt: now }
      })
    }

    if (color) {
      await systemSettings.upsert({
        where: { key: 'admin_announcement_color' },
        update: { value: color, updatedAt: now },
        create: { id: randomUUID(), key: 'admin_announcement_color', value: color, updatedAt: now }
      })
    }

    if (speed) {
      await systemSettings.upsert({
        where: { key: 'admin_announcement_speed' },
        update: { value: speed.toString(), updatedAt: now },
        create: { id: randomUUID(), key: 'admin_announcement_speed', value: speed.toString(), updatedAt: now }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save announcement' }, { status: 500 })
  }
}
