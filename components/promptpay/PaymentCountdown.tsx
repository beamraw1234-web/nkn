import { useEffect, useMemo, useState } from 'react'

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const endMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt])
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])

  const remainingSec = Math.max(0, Math.ceil((endMs - nowMs) / 1000))
  const totalSec = 10 * 60
  const progress = Math.max(0, Math.min(1, remainingSec / totalSec))

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full bg-white/10" />
        <div
          className="absolute inset-0 rounded-full bg-cyan-400/40"
          style={{ clipPath: `inset(${(1 - progress) * 100}% 0 0 0 round 999px)` }}
        />
        <div className="absolute inset-[3px] rounded-full bg-[#0b0f1a]" />
      </div>
      <div className="text-sm text-white/70">
        หมดอายุใน <span className="font-semibold text-white/90">{formatMMSS(remainingSec)}</span>
      </div>
    </div>
  )
}

