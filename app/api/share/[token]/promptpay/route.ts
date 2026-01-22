import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { omiseCreateCharge } from '@/lib/omise'
import { getOmiseRuntimeConfig } from '@/lib/omise-config'

type DownloadPaymentDelegate = {
  findUnique: (args: unknown) => Promise<{
    id?: unknown
    status?: unknown
    omiseChargeId?: unknown
    amount?: unknown
    currency?: unknown
    qrImageUrl?: unknown
    expiresAt?: unknown
  } | null>
  upsert: (args: unknown) => Promise<unknown>
}

const prismaClient = prisma as unknown as {
  fileshare: typeof prisma.fileshare
  file: typeof prisma.file
  downloadpayment: DownloadPaymentDelegate
}

function extractQrImageUrl(charge: unknown): string | null {
  const c = charge as Record<string, unknown> | null
  const source = c?.['source'] as Record<string, unknown> | null
  const scannable = source?.['scannable_code'] as Record<string, unknown> | null
  const image = scannable?.['image'] as Record<string, unknown> | null
  const url = (image?.['download_uri'] ?? image?.['uri']) as unknown
  return typeof url === 'string' && url.trim() ? url : null
}

function extractChargeId(charge: unknown): string | null {
  const c = charge as Record<string, unknown> | null
  const id = c?.['id']
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

export async function POST(_req: Request, { params }: { params: { token: string } | Promise<{ token: string }> }) {
  try {
    const config = await getOmiseRuntimeConfig()
    if (!config.enabled) {
      return NextResponse.json({ error: 'payment_disabled' }, { status: 400 })
    }

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
      select: { id: true, name: true, priceSatang: true }
    })
    if (!file) return NextResponse.json({ error: 'file_not_found' }, { status: 404 })

    const amountFromFile = Number(file.priceSatang || 0)
    if (!Number.isFinite(amountFromFile) || amountFromFile <= 0) {
      return NextResponse.json({ ok: true, status: 'FREE', paid: true })
    }

    const existing = await prismaClient.downloadpayment.findUnique({
      where: { shareToken: token },
      select: { id: true, status: true, omiseChargeId: true, amount: true, currency: true, qrImageUrl: true, expiresAt: true }
    })

    if (existing?.status === 'SUCCESS') {
      return NextResponse.json({ ok: true, status: 'SUCCESS', paid: true, chargeId: existing.omiseChargeId })
    }

    const now = new Date()
    if (existing?.status === 'PENDING' && existing.expiresAt && existing.expiresAt > now && existing.qrImageUrl) {
      return NextResponse.json({
        ok: true,
        status: existing.status,
        paid: false,
        chargeId: existing.omiseChargeId,
        qrImageUrl: existing.qrImageUrl,
        expiresAt: existing.expiresAt,
        amount: existing.amount,
        currency: existing.currency
      })
    }

    const currency = config.currency
    const amount = amountFromFile || config.defaultAmountSatang
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const charge = await omiseCreateCharge({
      amount,
      currency,
      description: `File download: ${file.name}`,
      expires_at: expiresAt.toISOString(),
      metadata: { shareToken: token, fileId: file.id },
      source: { type: 'promptpay' }
    })

    const chargeId = extractChargeId(charge)
    if (!chargeId) return NextResponse.json({ error: 'omise_invalid_charge' }, { status: 502 })

    const qrImageUrl = extractQrImageUrl(charge)
    if (!qrImageUrl) return NextResponse.json({ error: 'omise_missing_qr' }, { status: 502 })

    await prismaClient.downloadpayment.upsert({
      where: { shareToken: token },
      create: {
        id: randomUUID(),
        shareToken: token,
        omiseChargeId: chargeId,
        amount,
        currency,
        status: 'PENDING',
        qrImageUrl,
        expiresAt
      },
      update: {
        omiseChargeId: chargeId,
        amount,
        currency,
        status: 'PENDING',
        qrImageUrl,
        expiresAt,
        paidAt: null
      }
    })

    return NextResponse.json({
      ok: true,
      status: 'PENDING',
      paid: false,
      chargeId,
      qrImageUrl,
      expiresAt,
      amount,
      currency
    })
  } catch (error) {
    return NextResponse.json({ error: 'promptpay_create_failed', detail: String(error) }, { status: 500 })
  }
}
