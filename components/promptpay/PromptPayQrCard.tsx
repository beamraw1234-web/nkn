import Image from 'next/image'
import { PaymentCountdown } from './PaymentCountdown'

export function PromptPayQrCard(props: {
  qrImageUrl: string
  expiresAt: string
  amount: number
  currency: string
}) {
  const { qrImageUrl, expiresAt, amount, currency } = props

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.45)] backdrop-blur transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white/90">PromptPay QR</div>
          <div className="mt-1 text-xs text-white/60">
            ยอดชำระ {amount / 100} {currency.toUpperCase()}
          </div>
        </div>
        <PaymentCountdown expiresAt={expiresAt} />
      </div>

      <div className="mt-4 rounded-2xl bg-white p-3">
        <div className="relative aspect-square w-full">
          <Image
            src={qrImageUrl}
            alt="PromptPay QR"
            fill
            className="object-contain"
            sizes="(max-width: 480px) 80vw, 320px"
            unoptimized
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
        <span className="inline-flex h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
        กำลังรอการชำระเงิน
      </div>
    </div>
  )
}

