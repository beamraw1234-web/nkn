'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

type BroadcastPayload = {
  id: string
  type: 'ADMIN_ANNOUNCEMENT' | 'BROADCAST'
  title?: string
  message: string
  meta?: Record<string, unknown>
  createdAt: string
}

type Level = 'info' | 'success' | 'warning' | 'error'

function getLevel(meta?: Record<string, unknown>): Level {
  const v = meta?.level
  if (v === 'success' || v === 'warning' || v === 'error' || v === 'info') return v
  return 'info'
}

function getDurationMs(meta?: Record<string, unknown>): number {
  const v = meta?.durationMs
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.min(Math.max(Math.floor(v), 2000), 20000)
  }
  return 6000
}

function levelTheme(level: Level) {
  switch (level) {
    case 'success':
      return {
        accent: 'bg-emerald-500',
        ring: 'ring-emerald-500/20',
        Icon: CheckCircle2,
        iconClass: 'text-emerald-600 dark:text-emerald-400',
      }
    case 'warning':
      return {
        accent: 'bg-amber-500',
        ring: 'ring-amber-500/20',
        Icon: AlertCircle,
        iconClass: 'text-amber-600 dark:text-amber-400',
      }
    case 'error':
      return {
        accent: 'bg-rose-500',
        ring: 'ring-rose-500/20',
        Icon: XCircle,
        iconClass: 'text-rose-600 dark:text-rose-400',
      }
    default:
      return {
        accent: 'bg-cyan-500',
        ring: 'ring-cyan-500/20',
        Icon: Info,
        iconClass: 'text-cyan-600 dark:text-cyan-400',
      }
  }
}

export default function BroadcastListener() {
  const { status, data: session } = useSession()
  const lastIdRef = useRef<string>('')

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!session?.user?.id) return

    const es = new EventSource('/api/broadcast/stream', { withCredentials: true })

    const onBroadcast = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as BroadcastPayload
        if (!payload?.id || !payload?.message) return

        if (lastIdRef.current === payload.id) return
        lastIdRef.current = payload.id

        if (payload.type === 'ADMIN_ANNOUNCEMENT') {
          const title = payload.title || 'ประกาศ'
          const level = getLevel(payload.meta)
          const durationMs = getDurationMs(payload.meta)
          const theme = levelTheme(level)

          const createdText = (() => {
            const d = payload.createdAt ? new Date(payload.createdAt) : null
            if (!d || Number.isNaN(d.getTime())) return ''
            return d.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' })
          })()

          toast.custom(
            (t) => (
              <div
                className={`max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ${theme.ring} dark:border-neutral-800 dark:bg-neutral-900 will-change-transform transition-all ${
                  t.visible
                    ? 'opacity-100 translate-y-0 scale-100 duration-300 ease-out'
                    : 'opacity-0 translate-y-2 scale-[0.98] duration-200 ease-in'
                }`}
                onClick={() => toast.dismiss(t.id)}
                role="button"
                tabIndex={0}
              >
                <div className="flex">
                  <div className={`w-1.5 ${theme.accent} relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-40 animate-broadcastAccentShimmer bg-linear-to-b from-white/0 via-white/50 to-white/0 dark:via-white/30" />
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <theme.Icon size={20} className={theme.iconClass} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line wrap-break-word">{payload.message}</div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{createdText ? `เวลา ${createdText}` : 'ประกาศใหม่'}</span>
                          <span>คลิกเพื่อปิด</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-1 bg-gray-100 dark:bg-neutral-800">
                  <div
                    className={`h-1 ${theme.accent}`}
                    style={{
                      width: '100%',
                      animation: `broadcastToastProgress ${durationMs}ms linear forwards`,
                      transformOrigin: 'left',
                    }}
                  />
                </div>

                <style jsx>{`
                  @keyframes broadcastToastProgress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                  }

                  @keyframes broadcastAccentShimmer {
                    0% { transform: translateY(-120%); }
                    100% { transform: translateY(120%); }
                  }

                  :global(.animate-broadcastAccentShimmer) {
                    animation: broadcastAccentShimmer 1.4s ease-in-out infinite;
                  }
                `}</style>
              </div>
            ),
            {
              duration: durationMs,
              style: {
                background: 'transparent',
                boxShadow: 'none',
                padding: 0,
              },
              className: '!bg-transparent !shadow-none !p-0',
            }
          )
          return
        }

        toast(payload.message)
      } catch {
        // ignore malformed event
      }
    }

    es.addEventListener('broadcast', onBroadcast as EventListener)

    // If the stream errors (server restart), EventSource will auto-reconnect.
    // We keep it simple; browser handles backoff.

    return () => {
      es.removeEventListener('broadcast', onBroadcast as EventListener)
      es.close()
    }
  }, [status, session?.user?.id])

  return null
}
