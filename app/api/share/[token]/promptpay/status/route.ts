import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { omiseRetrieveCharge } from '@/lib/omise'
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
  } | null>
  update: (args: unknown) => Promise<unknown>
}

const prismaClient = prisma as unknown as {
  downloadpayment: DownloadPaymentDelegate
}

function normalizeStatus(charge: unknown): { status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'; paidAt?: Date | null } {
  const c = charge as Record<string, unknown> | null
  const paid = c?.['paid'] === true
  const status = String(c?.['status'] || '').toLowerCase()

  if (paid || status === 'successful') return { status: 'SUCCESS', paidAt: new Date() }
  if (status === 'failed' || status === 'voided') return { status: 'FAILED', paidAt: null }
  if (status === 'expired') return { status: 'EXPIRED', paidAt: null }
  return { status: 'PENDING', paidAt: null }
}

export async function GET(_req: Request, { params }: { params: { token: string } | Promise<{ token: string }> }) {
  try {
    const config = await getOmiseRuntimeConfig()
    if (!config.enabled) {
      return NextResponse.json({ error: 'payment_disabled' }, { status: 400 })
    }

    const p = (params instanceof Promise) ? await params : params
    const token = String(p.token || '').trim()
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

    const row = await prismaClient.downloadpayment.findUnique({
      where: { shareToken: token },
      select: { status: true, omiseChargeId: true, amount: true, currency: true, qrImageUrl: true, expiresAt: true, paidAt: true }
    })

    if (!row) {
      return NextResponse.json({ ok: true, status: 'UNPAID', paid: false })
    }

    if (row.status === 'SUCCESS') {
      return NextResponse.json({ ok: true, status: 'SUCCESS', paid: true, chargeId: row.omiseChargeId, paidAt: row.paidAt })
    }

    const now = new Date()
    if (row.expiresAt && row.expiresAt < now) {
      await prismaClient.downloadpayment.update({
        where: { shareToken: token },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json({ ok: true, status: 'EXPIRED', paid: false, chargeId: row.omiseChargeId })
    }

    const chargeId = String(row.omiseChargeId || '').trim()
    if (!chargeId) return NextResponse.json({ error: 'missing_charge' }, { status: 400 })

    const charge = await omiseRetrieveCharge(chargeId)
    const next = normalizeStatus(charge)

    if (row.status !== next.status) {
      await prismaClient.downloadpayment.update({
        where: { shareToken: token },
        data: { status: next.status, paidAt: next.status === 'SUCCESS' ? (row.paidAt ?? next.paidAt ?? new Date()) : null }
      })
    }

    return NextResponse.json({
      ok: true,
      status: next.status,
      paid: next.status === 'SUCCESS',
      chargeId: row.omiseChargeId,
      expiresAt: row.expiresAt,
      qrImageUrl: row.qrImageUrl,
      amount: row.amount,
      currency: row.currency
    })
  } catch (error) {
    return NextResponse.json({ error: 'promptpay_status_failed', detail: String(error) }, { status: 500 })
  }
}
