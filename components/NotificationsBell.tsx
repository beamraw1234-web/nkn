'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ShieldAlert, Check, X, MessageCircle, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

type NotificationItem = {
  id: string
  type: string
  title: string
  message?: string | null
  meta?: Record<string, unknown>
  createdAt: string
  readAt?: string | null
}

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('th-TH', { hour12: false })
  } catch {
    return ts
  }
}

export function NotificationsBell() {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const unreadIds = useMemo(() => items.filter((n) => !n.readAt).map((n) => n.id), [items])

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?take=30', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data?.items) ? data.items : [])
      setUnread(typeof data?.unreadCount === 'number' ? data.unreadCount : 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000) // Check every 5 seconds for faster updates
    
    // Listen for custom event to refresh immediately
    const handleRefresh = () => refresh()
    window.addEventListener('notification:refresh', handleRefresh)
    
    return () => {
      clearInterval(t)
      window.removeEventListener('notification:refresh', handleRefresh)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (ev: MouseEvent | PointerEvent) => {
      const root = rootRef.current
      const target = ev.target as Node | null
      if (!root || !target) return
      if (!root.contains(target)) setOpen(false)
    }

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function markRead(id: string) {
    setBusyId(id)
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await refresh()
      setOpen(false)
    } finally {
      setBusyId(null)
    }
  }

  async function markAllRead() {
    setBusyId('ALL')
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function notMe(token: string) {
    if (!token) return
    setBusyId('NOTME')
    try {
      const res = await fetch('/api/login-alert/not-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        // Token invalidation will kick out sessions; send user to login.
        router.replace('/login')
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Notifications"
        title="แจ้งเตือน"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-90 max-w-[90vw] rounded-2xl border border-white/20 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-2xl overflow-hidden z-60">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
            <div className="font-bold">แจ้งเตือน</div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                disabled={!unreadIds.length || busyId === 'ALL'}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-50"
              >
                อ่านทั้งหมด
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-105 overflow-auto">
            {loading && items.length === 0 ? (
              <div className="p-4 text-sm text-neutral-500">กำลังโหลด…</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-neutral-500">ยังไม่มีแจ้งเตือน</div>
            ) : (
              <div className="p-3 space-y-2">
                {items.map((n) => {
                  const isUnread = !n.readAt
                  const notMeToken = n?.meta?.notMeToken
                  const mapUrl = n?.meta?.mapUrl as string | undefined

                  return (
                    <div
                      key={n.id}
                      className={`rounded-2xl border p-3 ${isUnread ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/20' : 'border-black/5 dark:border-white/10 bg-white/60 dark:bg-neutral-900/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {n.type === 'LOGIN_ALERT' && (
                              <ShieldAlert size={16} className="text-red-500" />
                            )}
                            {n.type === 'FRIEND_REQUEST' && (
                              <Users size={16} className="text-purple-500" />
                            )}
                            {n.type === 'CHAT_MESSAGE' && (
                              <MessageCircle size={16} className="text-blue-500" />
                            )}
                            {n.type === 'BROADCAST_MESSAGE' && (
                              <MessageCircle size={16} className="text-green-500" />
                            )}
                            <div className="font-semibold truncate">{n.title}</div>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">{formatTs(n.createdAt)}</div>
                        </div>
                        {isUnread && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 mt-2" />
                        )}
                      </div>

                      {n.message && (
                        <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-line">
                          {n.message}
                        </div>
                      )}

                      {mapUrl && (
                        <a
                          href={String(mapUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
                        >
                          เปิดแผนที่
                        </a>
                      )}

                      {n.type === 'FRIEND_REQUEST' && (n.meta?.friendshipId as string | undefined) && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold text-sm"
                          >
                            ไปที่คำขอ
                          </button>
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-50 font-semibold text-sm"
                          >
                            ปิด
                          </button>
                        </div>
                      )}

                      {n.type === 'CHAT_MESSAGE' && (n.meta?.chatMessageId as string | undefined) && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm"
                          >
                            ไปที่แชท
                          </button>
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-50 font-semibold text-sm"
                          >
                            ปิด
                          </button>
                        </div>
                      )}

                      {n.type === 'BROADCAST_MESSAGE' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm"
                          >
                            ไปที่แชท
                          </button>
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-50 font-semibold text-sm"
                          >
                            ปิด
                          </button>
                        </div>
                      )}

                      {(notMeToken as string | undefined) && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="flex-1 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-50 font-semibold text-sm"
                          >
                            ฉันเอง
                          </button>
                          <button
                            onClick={() => notMe(String(notMeToken))}
                            disabled={busyId === 'NOTME'}
                            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-sm"
                          >
                            ไม่ใช่ฉัน
                          </button>
                        </div>
                      )}

                      {!notMeToken && n.type !== 'FRIEND_REQUEST' && n.type !== 'CHAT_MESSAGE' && n.type !== 'BROADCAST_MESSAGE' && (
                        <div className="mt-3">
                          <button
                            onClick={() => markRead(n.id)}
                            disabled={!isUnread || busyId === n.id}
                            className="h-10 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-50 font-semibold text-sm flex items-center gap-2 w-full justify-center"
                          >
                            <Check size={16} />
                            อ่านแล้ว
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
