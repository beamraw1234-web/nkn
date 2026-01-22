import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOmiseRuntimeConfig } from '@/lib/omise-config'

type DownloadPaymentDelegate = {
  findUnique: (args: unknown) => Promise<{
    status?: unknown
    omiseChargeId?: unknown
    amount?: unknown
    currency?: unknown
    qrImageUrl?: unknown
    expiresAt?: unknown
    paidAt?: unknown
    updatedAt?: unknown
  } | null>
}

const prismaClient = prisma as unknown as {
  fileshare: typeof prisma.fileshare
  file: typeof prisma.file
  downloadpayment: DownloadPaymentDelegate
}

export async function GET(_req: Request, { params }: { params: { token: string } | Promise<{ token: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const token = String(p.token || '').trim()
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

    const share = await prismaClient.fileshare.findUnique({
      where: { token },
      select: { id: true, fileId: true, expiresAt: true, downloads: true, maxDownloads: true }
    })

    if (!share) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (share.expiresAt && share.expiresAt < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 })
    if (typeof share.maxDownloads === 'number' && share.downloads >= share.maxDownloads) {
      return NextResponse.json({ error: 'download_limit_reached' }, { status: 410 })
    }

    const file = await prismaClient.file.findUnique({
      where: { id: share.fileId },
      select: { id: true, name: true, mime: true, size: true, priceSatang: true }
    })
    if (!file) return NextResponse.json({ error: 'file_not_found' }, { status: 404 })

    const config = await getOmiseRuntimeConfig()
    const enabled = config.enabled
    const currency = config.currency
    const amountFromFile = Number(file.priceSatang || 0)
    const required = enabled && amountFromFile > 0
    const fallbackAmount = enabled ? config.defaultAmountSatang : null

    const payment = enabled
      ? await prismaClient.downloadpayment.findUnique({
          where: { shareToken: token },
          select: { status: true, omiseChargeId: true, amount: true, currency: true, qrImageUrl: true, expiresAt: true, paidAt: true, updatedAt: true }
        })
      : null

    const paid = !required || payment?.status === 'SUCCESS'

    return NextResponse.json({
      ok: true,
      token,
      file: { name: file.name, mime: file.mime, size: file.size, priceSatang: file.priceSatang },
      share: { expiresAt: share.expiresAt, downloads: share.downloads, maxDownloads: share.maxDownloads },
      payment: enabled
        ? {
            enabled: true,
            required,
            amount: required ? (payment?.amount ?? amountFromFile ?? fallbackAmount) : 0,
            currency: payment?.currency ?? currency,
            status: required ? (payment?.status ?? 'UNPAID') : 'FREE',
            paid,
            chargeId: payment?.omiseChargeId ?? null,
            qrImageUrl: payment?.qrImageUrl ?? null,
            expiresAt: payment?.expiresAt ?? null,
            paidAt: payment?.paidAt ?? null,
            updatedAt: payment?.updatedAt ?? null
          }
        : { enabled: false, required: false }
    })
  } catch (error) {
    return NextResponse.json({ error: 'share_info_failed', detail: String(error) }, { status: 500 })
  }
}
