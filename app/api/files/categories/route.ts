import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    const cats = await prisma.category.findMany({
      where: isAdmin ? {} : {
        visible: true,
        locks: {
          none: {
            userId: session?.user?.id || '',
            locked: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { files: true } } }
    })
    const catsWithCount = cats.map(c => ({ ...c, count: c._count.files }))
    return NextResponse.json(catsWithCount)
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'cat_list_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, slug, visible, createdBy } = body
    if (!name) return NextResponse.json({ ok: false, message: 'missing_name' }, { status: 400 })

    const s = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const rec = await prisma.category.create({ data: { name, slug: s, visible: typeof visible === 'boolean' ? visible : true, createdBy: createdBy || null } })
    return NextResponse.json({ ok: true, category: rec })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'cat_create_error', detail: String(e) }, { status: 500 })
  }
}
