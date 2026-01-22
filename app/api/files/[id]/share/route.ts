import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { randomUUID } from 'crypto'
import { generateToken } from '@/lib/tokens'

const prismaClient = prisma as unknown as {
  fileshare: {
    create: typeof prisma.fileshare.create
    findMany: typeof prisma.fileshare.findMany
    findUnique: typeof prisma.fileshare.findUnique
    delete: typeof prisma.fileshare.delete
  }
  file: typeof prisma.file
}

export async function POST(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const p = (params instanceof Promise) ? await params : params
    const fileId = p.id
    const body = await req.json().catch(() => ({}))
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null
    const maxDownloads = typeof body?.maxDownloads === 'number' ? Math.max(1, Math.floor(body.maxDownloads)) : null

    const file = await prismaClient.file.findUnique({
      where: { id: fileId },
      select: { id: true, createdBy: true }
    })

    if (!file) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && file.createdBy && file.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const rawToken = generateToken()

    const share = await prismaClient.fileshare.create({
      data: {
        id: randomUUID(),
        fileId,
        token: rawToken,
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
        maxDownloads,
        createdBy: session.user.id
      }
    })

    return NextResponse.json({
      ok: true,
      id: share.id,
      token: rawToken,
      shareUrl: `/share/${rawToken}`,
      expiresAt: share.expiresAt,
      maxDownloads: share.maxDownloads
    })
  } catch (error) {
    return NextResponse.json({ error: 'share_create_failed', detail: String(error) }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const p = (params instanceof Promise) ? await params : params
    const fileId = p.id

    const file = await prismaClient.file.findUnique({
      where: { id: fileId },
      select: { id: true, createdBy: true }
    })

    if (!file) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && file.createdBy && file.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const shares = await prismaClient.fileshare.findMany({
      where: { fileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        downloads: true,
        maxDownloads: true,
        createdAt: true
      }
    })

    return NextResponse.json({ ok: true, shares })
  } catch (error) {
    return NextResponse.json({ error: 'share_list_failed', detail: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const p = (params instanceof Promise) ? await params : params
    const fileId = p.id
    const { searchParams } = new URL(req.url)
    const shareId = String(searchParams.get('shareId') || '').trim()

    if (!shareId) {
      return NextResponse.json({ error: 'missing_share_id' }, { status: 400 })
    }

    const file = await prismaClient.file.findUnique({
      where: { id: fileId },
      select: { id: true, createdBy: true }
    })

    if (!file) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && file.createdBy && file.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const share = await prismaClient.fileshare.findUnique({
      where: { id: shareId },
      select: { id: true, fileId: true }
    })

    if (!share || share.fileId !== fileId) {
      return NextResponse.json({ error: 'share_not_found' }, { status: 404 })
    }

    await prismaClient.fileshare.delete({ where: { id: shareId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'share_revoke_failed', detail: String(error) }, { status: 500 })
  }
}
