'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Download, RefreshCw, ShieldCheck, QrCode } from 'lucide-react'
import { Space_Grotesk, Noto_Sans_Thai } from 'next/font/google'
import { PromptPayQrCard } from '@/components/promptpay/PromptPayQrCard'
import { usePromptPayPayment } from '@/components/promptpay/usePromptPayPayment'

const headingFont = Space_Grotesk({ subsets: ['latin'], weight: ['400', '600', '700'] })
const thaiFont = Noto_Sans_Thai({ subsets: ['thai'], weight: ['400', '600'] })

type PageStatus = 'loading' | 'ready' | 'error'
type DownloadStatus = 'idle' | 'downloading'

const errorCopy: Record<string, { title: string; detail: string }> = {
  expired: {
    title: 'ลิงก์นี้หมดอายุแล้ว',
    detail: 'ลิงก์แชร์นี้ใช้งานไม่ได้แล้ว โปรดขอให้เจ้าของไฟล์สร้างลิงก์ใหม่อีกครั้ง'
  },
  download_limit_reached: {
    title: 'ดาวน์โหลดครบตามจำนวนที่กำหนด',
    detail: 'ลิงก์นี้ถูกจำกัดจำนวนดาวน์โหลดไว้ และตอนนี้ครบลิมิตแล้ว'
  },
  file_missing: {
    title: 'ไม่พบไฟล์ต้นฉบับบนเซิร์ฟเวอร์',
    detail: 'ไฟล์ถูกย้ายหรือลบออกจากระบบ โปรดแจ้งเจ้าของไฟล์ตรวจสอบอีกครั้ง'
  },
  file_not_found: {
    title: 'ไม่พบไฟล์ที่ต้องการ',
    detail: 'ไฟล์นี้อาจถูกลบหรือย้ายออกจากระบบแล้ว'
  },
  not_found: {
    title: 'ไม่พบลิงก์แชร์',
    detail: 'ลิงก์นี้อาจถูกยกเลิกหรือไม่ถูกต้อง'
  }
}

const parseFilename = (header: string | null) => {
  if (!header) return null
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''))
  const asciiMatch = header.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ? asciiMatch[1] : null
}

export default function ShareTokenPage() {
  const params = useParams<{ token: string }>()
  const token = String(params?.token || '')
  const [status, setStatus] = useState<PageStatus>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')

  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [initialPaid, setInitialPaid] = useState(false)
  const [initialChargeId, setInitialChargeId] = useState<string | null>(null)

  const payment = usePromptPayPayment(token, { paid: initialPaid, chargeId: initialChargeId })

  const errorMeta = useMemo(() => {
    if (!errorCode) return null
    return errorCopy[errorCode] || {
      title: 'ไม่สามารถดาวน์โหลดไฟล์ได้',
      detail: `ระบบแจ้งข้อผิดพลาด: ${errorCode}`
    }
  }, [errorCode])

  useEffect(() => {
    if (!token) return
    let revoked = false
    const controller = new AbortController()

    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/share/${token}/info`, { signal: controller.signal, cache: 'no-store' })
        if (!res.ok) {
          let code = 'unknown_error'
          try {
            const data = await res.json()
            if (data?.error) code = data.error
          } catch (err) {
            code = `http_${res.status}`
          }
          if (!revoked) {
            setErrorCode(code)
            setStatus('error')
          }
          return
        }

        const data = await res.json().catch(() => null)
        const paid = Boolean(data?.payment?.paid)
        const enabled = Boolean(data?.payment?.enabled)
        const required = Boolean(data?.payment?.required)
        const chargeId = typeof data?.payment?.chargeId === 'string' ? data.payment.chargeId : null
        if (!revoked) {
          setFilename(typeof data?.file?.name === 'string' ? data.file.name : null)
          setPaymentEnabled(enabled)
          setPaymentRequired(required)
          setInitialPaid(paid)
          setInitialChargeId(chargeId)
          setStatus('ready')
        }
      } catch (err) {
        if (!revoked) {
          setErrorCode('network_error')
          setStatus('error')
        }
      }
    }

    fetchInfo()
    return () => {
      revoked = true
      controller.abort()
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [token])

  const handleDownload = async () => {
    if (!token || downloadStatus === 'downloading') return
    setDownloadStatus('downloading')
    try {
      const res = await fetch(`/api/share/${token}`, { cache: 'no-store' })
      if (!res.ok) {
        let code = `http_${res.status}`
        try {
          const data = await res.json()
          if (data?.error) code = data.error
        } catch {}
        setErrorCode(code)
        setStatus('error')
        return
      }

      const blob = await res.blob()
      const name = parseFilename(res.headers.get('content-disposition')) || filename
      const url = URL.createObjectURL(blob)
      setFilename(name ?? null)
      setDownloadUrl(url)

      const anchor = document.createElement('a')
      anchor.href = url
      if (name) anchor.download = name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } finally {
      setDownloadStatus('idle')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0f1a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-cyan-400/40 via-blue-500/20 to-transparent blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-fuchsia-500/30 via-amber-400/10 to-transparent blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
      </div>

      <div className={`relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12 ${headingFont.className} ${thaiFont.className}`}>
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:border-white/30 hover:text-white transition"
          >
            <ArrowLeft size={16} />
            กลับหน้าหลัก
          </Link>
          <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/50">
            Secure Share
          </span>
        </div>

        <div className="mt-16 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_35px_120px_rgba(10,10,25,0.45)] backdrop-blur">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                <RefreshCw className="animate-spin" size={26} />
              </div>
              <h1 className="text-2xl font-semibold">กำลังเตรียมไฟล์ดาวน์โหลด</h1>
              <p className="text-sm text-white/60">โปรดรอสักครู่ ระบบกำลังตรวจสอบลิงก์และเตรียมไฟล์ให้พร้อม</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="flex flex-col items-center gap-6 text-center transition">
              {paymentEnabled && paymentRequired ? (
                <>
                  {payment.state.phase === 'success' ? (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                        <ShieldCheck size={26} />
                      </div>
                      <h1 className="text-3xl font-semibold">ชำระเงินสำเร็จ</h1>
                      <p className="text-sm text-white/65">กดปุ่มด้านล่างเพื่อดาวน์โหลดไฟล์</p>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 rounded-full bg-cyan-400/90 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(34,211,238,0.35)] hover:bg-cyan-300 transition disabled:opacity-60"
                        disabled={downloadStatus === 'downloading'}
                      >
                        <Download size={16} />
                        {downloadStatus === 'downloading' ? 'กำลังดาวน์โหลด…' : 'ดาวน์โหลดไฟล์'}
                      </button>
                    </>
                  ) : payment.state.phase === 'awaiting' ? (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                        <QrCode size={26} />
                      </div>
                      <h1 className="text-2xl font-semibold">ชำระเงินก่อนดาวน์โหลด</h1>
                      <PromptPayQrCard
                        qrImageUrl={payment.state.qrImageUrl}
                        expiresAt={payment.state.expiresAt}
                        amount={payment.state.amount}
                        currency={payment.state.currency}
                      />
                      <button
                        onClick={payment.refresh}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm text-white/80 hover:border-white/30 hover:text-white transition"
                      >
                        <RefreshCw size={16} className="animate-spin" />
                        ตรวจสอบสถานะ
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                        <QrCode size={26} />
                      </div>
                      <h1 className="text-3xl font-semibold">ชำระเงินก่อนดาวน์โหลด</h1>
                      <p className="text-sm text-white/65">กดปุ่มเพื่อสร้าง PromptPay QR และรอการชำระเงิน</p>
                      <button
                        onClick={payment.create}
                        className="inline-flex items-center gap-2 rounded-full bg-cyan-400/90 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(34,211,238,0.35)] hover:bg-cyan-300 transition disabled:opacity-60"
                        disabled={!payment.canPay || payment.state.phase === 'creating'}
                      >
                        {payment.state.phase === 'creating' ? <RefreshCw size={16} className="animate-spin" /> : <QrCode size={16} />}
                        ชำระเงินก่อนดาวน์โหลด
                      </button>
                      {payment.state.phase === 'expired' && (
                        <div className="text-sm text-amber-200/90">QR หมดอายุแล้ว กรุณาสร้างใหม่</div>
                      )}
                      {payment.state.phase === 'error' && (
                        <div className="text-sm text-rose-200/90">{payment.state.message}</div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                    <ShieldCheck size={26} />
                  </div>
                  <h1 className="text-3xl font-semibold">พร้อมดาวน์โหลดแล้ว</h1>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-400/90 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(34,211,238,0.35)] hover:bg-cyan-300 transition disabled:opacity-60"
                    disabled={downloadStatus === 'downloading'}
                  >
                    <Download size={16} />
                    {downloadStatus === 'downloading' ? 'กำลังดาวน์โหลด…' : 'ดาวน์โหลดไฟล์'}
                  </button>
                </>
              )}

              {filename && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                  ไฟล์: {filename}
                </div>
              )}
            </div>
          )}

          {false && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <ShieldCheck size={26} />
              </div>
              <h1 className="text-3xl font-semibold">พร้อมดาวน์โหลดแล้ว</h1>
              <p className="text-sm text-white/65">
                ระบบเริ่มดาวน์โหลดให้แล้ว หากไม่เริ่มอัตโนมัติให้กดปุ่มด้านล่าง
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400/90 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(34,211,238,0.35)] hover:bg-cyan-300"
                >
                  <Download size={16} />
                  ดาวน์โหลดอีกครั้ง
                </button>
              </div>
              {filename && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                  ไฟล์: {filename}
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200">
                <AlertTriangle size={26} />
              </div>
              <h1 className="text-3xl font-semibold">{errorMeta?.title || 'เกิดข้อผิดพลาด'}</h1>
              <p className="text-sm text-white/65">{errorMeta?.detail || 'ไม่สามารถเปิดลิงก์นี้ได้'}</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
                รหัสข้อผิดพลาด: {errorCode || 'unknown'}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm text-white/80 hover:border-white/30 hover:text-white"
                >
                  กลับหน้าหลัก
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
