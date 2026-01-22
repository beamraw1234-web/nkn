import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { getOmiseRuntimeConfig } from '@/lib/omise-config'

type DownloadPaymentDelegate = {
  findUnique: (args: unknown) => Promise<{ status?: unknown } | null>
}

const prismaClient = prisma as unknown as {
  fileshare: typeof prisma.fileshare
  file: typeof prisma.file
  downloadpayment: DownloadPaymentDelegate
}

export async function GET(req: Request, { params }: { params: { token: string } | Promise<{ token: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const token = String(p.token || '').trim()
    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const share = await prismaClient.fileshare.findUnique({
      where: { token },
      select: {
        id: true,
        fileId: true,
        expiresAt: true,
        downloads: true,
        maxDownloads: true
      }
    })

    if (!share) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 410 })
    }

    if (typeof share.maxDownloads === 'number' && share.downloads >= share.maxDownloads) {
      return NextResponse.json({ error: 'download_limit_reached' }, { status: 410 })
    }

    const file = await prismaClient.file.findUnique({
      where: { id: share.fileId },
      select: { name: true, mime: true, storageKey: true, priceSatang: true }
    })

    if (!file) {
      return NextResponse.json({ error: 'file_not_found' }, { status: 404 })
    }

    const config = await getOmiseRuntimeConfig()
    if (config.enabled) {
      const required = Number(file.priceSatang || 0) > 0
      if (required) {
      const payment = await prismaClient.downloadpayment.findUnique({
        where: { shareToken: token },
        select: { status: true }
      })
      if (payment?.status !== 'SUCCESS') {
        return NextResponse.json({ error: 'payment_required' }, { status: 402 })
      }
      }
    }

    const filePath = path.join(process.cwd(), 'storage', 'files', file.storageKey)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'file_missing' }, { status: 404 })
    }

    await prismaClient.fileshare.update({
      where: { id: share.id },
      data: { downloads: { increment: 1 } }
    })

    const buffer = fs.readFileSync(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.mime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'share_download_failed', detail: String(error) }, { status: 500 })
  }
}
