import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAdminToken } from '@/lib/adminAuth'

function generateApiKey() {
  const prefix = randomBytes(4).toString('hex')
  const secret = randomBytes(24).toString('base64url')
  return { prefix, apiKey: `${prefix}.${secret}` }
}

export async function GET(req: Request) {
  if (!requireAdminToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const keys = await prisma.apikey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      apiKeyPrefix: true,
      isActive: true,
      lastSeen: true,
      lastIp: true,
      createdAt: true,
      updatedAt: true
    }
  })
  return NextResponse.json({ keys })
}

export async function POST(req: Request) {
  if (!requireAdminToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const name = String(body?.name || '').trim().slice(0, 120)
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    let created: { id: string; apiKeyPrefix: string } | null = null
    let apiKeyPlain = ''

    for (let attempt = 0; attempt < 5; attempt++) {
      const { prefix, apiKey } = generateApiKey()
      try {
        const apiKeyHash = await bcrypt.hash(apiKey, 10)
        created = await prisma.apikey.create({
          data: { id: randomUUID(), apiKeyPrefix: prefix, apiKeyHash, name, isActive: true },
          select: { id: true, apiKeyPrefix: true }
        })
        apiKeyPlain = apiKey
        break
      } catch (e) {
        if (attempt === 4) throw e
      }
    }

    if (!created || !apiKeyPlain) return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    return NextResponse.json({ key: created, apiKey: apiKeyPlain })
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

