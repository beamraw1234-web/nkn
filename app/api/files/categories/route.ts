import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    const cats = await prisma.category.findMany({
      where: isAdmin ? {} : {
        visible: true,
        categorylock: {
          none: {
            userId: session?.user?.id || '',
            locked: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { file: true } } }
    })
    const catsWithCount = cats.map(c => ({ ...c, count: c._count.file }))
    return NextResponse.json(catsWithCount)
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'cat_list_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, slug, visible } = body
    if (!name) return NextResponse.json({ ok: false, message: 'missing_name' }, { status: 400 })

    const s = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const rec = await prisma.category.create({
      data: {
        id: randomUUID(),
        name,
        slug: s,
        visible: typeof visible === 'boolean' ? visible : true,
        createdBy: session.user.id,
        updatedAt: new Date()
      }
    })
    return NextResponse.json({ ok: true, category: rec })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'cat_create_error', detail: String(e) }, { status: 500 })
  }
}
