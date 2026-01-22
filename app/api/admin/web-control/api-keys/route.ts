import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'crypto'
import { createLog } from '@/lib/log'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

function generateApiKey() {
  const prefix = randomBytes(4).toString('hex') // 8 chars
  const secret = randomBytes(24).toString('base64url')
  return { prefix, apiKey: `${prefix}.${secret}` }
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const name = String(body?.name || '').trim().slice(0, 120)
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    let created:
      | {
          id: string
          apiKeyPrefix: string
          apiKeyHash: string
          name: string
          isActive: boolean
          lastSeen: Date | null
          lastIp: string | null
          createdAt: Date
          updatedAt: Date
        }
      | null = null

    let apiKeyPlain = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const { prefix, apiKey } = generateApiKey()
      try {
        const apiKeyHash = await bcrypt.hash(apiKey, 10)
        created = await prisma.apikey.create({
          data: {
            id: randomUUID(),
            apiKeyPrefix: prefix,
            apiKeyHash,
            name,
            isActive: true
          }
        })
        apiKeyPlain = apiKey
        break
      } catch (error) {
        // retry on unique collision (prefix)
        created = null
        apiKeyPlain = ''
        if (attempt === 4) throw error
      }
    }

    if (!created || !apiKeyPlain) {
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    await createLog(
      session.user.name || 'Admin',
      'สร้าง API Key',
      'ADMIN',
      `สร้างคีย์สำหรับ "${name}" (${created.apiKeyPrefix})`,
      session.user.id
    )

    // ส่งค่า apiKey (plaintext) แค่ครั้งเดียวตอนสร้าง
    return NextResponse.json({
      key: {
        id: created.id,
        name: created.name,
        apiKeyPrefix: created.apiKeyPrefix,
        isActive: created.isActive,
        createdAt: created.createdAt
      },
      apiKey: apiKeyPlain
    })
  } catch (error) {
    console.error('POST /api/admin/web-control/api-keys failed:', error)
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
}

