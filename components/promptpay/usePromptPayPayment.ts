import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type PromptPayPaymentState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'awaiting'; chargeId: string; qrImageUrl: string; expiresAt: string; amount: number; currency: string }
  | { phase: 'success'; chargeId: string; paidAt?: string | null }
  | { phase: 'expired'; chargeId?: string }
  | { phase: 'error'; message: string }

type CreateResponse =
  | { ok: true; status: 'PENDING'; paid: false; chargeId: string; qrImageUrl: string; expiresAt: string; amount: number; currency: string }
  | { ok: true; status: 'SUCCESS'; paid: true; chargeId: string }

type StatusResponse =
  | { ok: true; status: 'UNPAID'; paid: false }
  | { ok: true; status: 'PENDING' | 'FAILED' | 'EXPIRED'; paid: false; chargeId: string; expiresAt?: string | null; qrImageUrl?: string | null; amount?: number; currency?: string }
  | { ok: true; status: 'SUCCESS'; paid: true; chargeId: string; paidAt?: string | null }

export function usePromptPayPayment(token: string, initial?: { paid?: boolean; chargeId?: string | null }) {
  const [state, setState] = useState<PromptPayPaymentState>(() => {
    if (initial?.paid && initial.chargeId) return { phase: 'success', chargeId: initial.chargeId }
    return { phase: 'idle' }
  })

  useEffect(() => {
    const chargeId = initial?.chargeId
    if (!initial?.paid || typeof chargeId !== 'string' || !chargeId.trim()) return
    setState((prev) => {
      if (prev.phase === 'success') return prev
      if (prev.phase === 'awaiting' || prev.phase === 'creating') return prev
      return { phase: 'success', chargeId: chargeId.trim() }
    })
  }, [initial?.chargeId, initial?.paid])

  const pollTimer = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimer.current) window.clearInterval(pollTimer.current)
    pollTimer.current = null
  }, [])

  const pollStatus = useCallback(async () => {
    const res = await fetch(`/api/share/${token}/promptpay/status`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as StatusResponse

    if (data.ok && data.status === 'SUCCESS') {
      stopPolling()
      setState({ phase: 'success', chargeId: data.chargeId, paidAt: data.paidAt })
      return
    }

    if (data.ok && data.status === 'EXPIRED') {
      stopPolling()
      setState({ phase: 'expired', chargeId: 'chargeId' in data ? data.chargeId : undefined })
      return
    }

    if (data.ok && data.status === 'FAILED') {
      stopPolling()
      setState({ phase: 'error', message: 'การชำระเงินไม่สำเร็จ กรุณาลองใหม่' })
      return
    }

    // Keep awaiting state if we already have QR data
    if (data.ok && data.status === 'PENDING') return
  }, [stopPolling, token])

  const startPolling = useCallback(() => {
    stopPolling()
    pollTimer.current = window.setInterval(() => {
      pollStatus().catch(() => {})
    }, 2000)
  }, [pollStatus, stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  const create = useCallback(async () => {
    setState({ phase: 'creating' })
    try {
      const res = await fetch(`/api/share/${token}/promptpay`, { method: 'POST' })
      const data = (await res.json().catch(() => null)) as CreateResponse | { error?: string }
      if (!res.ok || !data || (data as any).error) {
        throw new Error((data as any)?.error || `HTTP ${res.status}`)
      }

      if ((data as any).status === 'SUCCESS') {
        setState({ phase: 'success', chargeId: (data as any).chargeId })
        return
      }

      const pending = data as Extract<CreateResponse, { status: 'PENDING' }>
      setState({
        phase: 'awaiting',
        chargeId: pending.chargeId,
        qrImageUrl: pending.qrImageUrl,
        expiresAt: pending.expiresAt,
        amount: pending.amount,
        currency: pending.currency
      })
      startPolling()
    } catch (err) {
      setState({ phase: 'error', message: 'ไม่สามารถสร้าง QR ได้ กรุณาลองใหม่อีกครั้ง' })
    }
  }, [startPolling, token])

  const canPay = state.phase === 'idle' || state.phase === 'expired' || state.phase === 'error'

  const countdown = useMemo(() => {
    if (state.phase !== 'awaiting') return null
    return state.expiresAt
  }, [state])

  return {
    state,
    canPay,
    countdownExpiresAt: countdown,
    create,
    refresh: pollStatus
  }
}
