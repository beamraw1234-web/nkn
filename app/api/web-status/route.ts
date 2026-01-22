import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || forwarded.trim()
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || undefined
}

async function getOffwebRow() {
  return prisma.offweb.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      isOff: false,
      message: 'ปิดปรับปรุงระบบ',
      updatedAt: new Date()
    }
  })
}

export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-KEY')
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }

    const prefix = apiKey.split('.')[0] || ''
    if (prefix.length < 4) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const record = await prisma.apikey.findUnique({
      where: { apiKeyPrefix: prefix }
    })

    if (!record || !record.isActive) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const ok = await bcrypt.compare(apiKey, record.apiKeyHash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    await prisma.apikey.update({
      where: { id: record.id },
      data: {
        lastSeen: new Date(),
        lastIp: getClientIp(req) || null
      }
    })

    const offweb = await getOffwebRow()
    return NextResponse.json({
      off: Boolean(offweb.isOff),
      message: String(offweb.message || 'ปิดปรับปรุงระบบ')
    })
  } catch (error) {
    console.error('GET /api/web-status failed:', error)
    return NextResponse.json({ off: false, message: '' }, { status: 200 })
  }
}

