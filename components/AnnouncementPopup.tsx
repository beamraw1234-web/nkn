"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Clock3, Megaphone } from 'lucide-react'

type PopupData = {
  id: string
  title?: string
  imageUrl: string
  startAt?: string | null
  endAt?: string | null
  hideHours?: number
  updatedAt?: string
}

const STORAGE_KEY = 'announcement-popup:dismissed:'
const STORAGE_CACHE = 'announcement-popup:cache'
const SESSION_SEEN = 'announcement-popup:seen:'

type DismissRecord = {
  hideUntil: number
  dismissedAt: number
}

function getDismissKey(announcement: { id: string; updatedAt?: string }) {
  const version = typeof announcement.updatedAt === 'string' ? announcement.updatedAt : ''
  return `${announcement.id}:${version}`
}

function readDismissRecord(key: string): DismissRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.hideUntil === 'number' && typeof parsed.dismissedAt === 'number') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeDismissRecord(key: string, hours: number) {
  if (typeof window === 'undefined') return
  const durationMs = Math.max(0, Math.round(hours * 60 * 60 * 1000))
  const hideUntil = Date.now() + durationMs
  const record: DismissRecord = { hideUntil, dismissedAt: Date.now() }
  try {
    localStorage.setItem(`${STORAGE_KEY}${key}`, JSON.stringify(record))
  } catch {
    // ignore write errors
  }
}

function readSeen(key: string) {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(`${SESSION_SEEN}${key}`) === '1'
  } catch {
    return false
  }
}

function writeSeen(key: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${SESSION_SEEN}${key}`, '1')
  } catch {
    // ignore
  }
}

export function AnnouncementPopup() {
  const [queue, setQueue] = useState<PopupData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const current = queue[currentIndex]

  const hideHours = useMemo(() => {
    if (!current) return 24
    const value = Number(current.hideHours)
    if (!Number.isFinite(value)) return 24
    return Math.min(Math.max(Math.round(value), 0), 24 * 30)
  }, [current])

  const isWithinWindow = (item: PopupData) => {
    const now = new Date()
    const start = item.startAt ? new Date(item.startAt) : null
    const end = item.endAt ? new Date(item.endAt) : null
    const startOk = !start || start <= now
    const endOk = !end || end >= now
    return startOk && endOk
  }

  useEffect(() => {
    let cancelled = false

    const hydrateFromCache = () => {
      if (typeof window === 'undefined') return
      try {
        const raw = localStorage.getItem(STORAGE_CACHE)
        if (!raw) return
        const cached: PopupData[] = JSON.parse(raw)
        const filtered = cached.filter((announcement) => {
          if (!announcement?.id || !announcement.imageUrl) return false
          if (!isWithinWindow(announcement)) return false
          const key = getDismissKey(announcement)
          if (readSeen(key)) return false
          const dismissed = readDismissRecord(key)
          if (dismissed && dismissed.hideUntil > Date.now()) return false
          return true
        })
        return filtered
      } catch {
        return undefined
      }
    }

    const preload = hydrateFromCache()
    if (!cancelled && preload && preload.length) {
      // Defer state update to avoid cascading renders warning
      setTimeout(() => {
        if (cancelled) return
        setQueue(preload)
        setCurrentIndex(0)
        setIsOpen(true)
      }, 0)
    }

    const fetchAnnouncement = async () => {
      try {
        const res = await fetch('/api/announcement-popup?activeOnly=true', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const announcements: PopupData[] = Array.isArray(data?.announcements)
          ? data.announcements
          : data?.announcement
            ? [data.announcement]
            : []
        const filtered = announcements.filter((announcement) => {
          if (!announcement?.id || !announcement.imageUrl) return false
          if (!isWithinWindow(announcement)) return false
          const key = getDismissKey(announcement)
          if (readSeen(key)) return false
          const dismissed = readDismissRecord(key)
          if (dismissed && dismissed.hideUntil > Date.now()) return false
          return true
        })

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_CACHE, JSON.stringify(announcements))
          } catch {
            // ignore cache write errors
          }
        }

        if (cancelled) return

        if (filtered.length) {
          setQueue(filtered)
          setCurrentIndex(0)
          setIsOpen(true)
        } else {
          setQueue([])
          setCurrentIndex(0)
          setIsOpen(false)
        }
      } catch (error) {
        console.error('Failed to load announcement popup', error)
      }
    }

    fetchAnnouncement()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  const advance = useCallback(
    (remember: boolean) => {
      if (!current) {
        setIsOpen(false)
        return
      }

      // Always remember "already seen" for this tab/session (persists across refresh)
      writeSeen(getDismissKey(current))

      if (remember) {
        writeDismissRecord(getDismissKey(current), hideHours)
      }

      // Find next not-dismissed item
      let next = -1
      for (let i = currentIndex + 1; i < queue.length; i++) {
        const key = getDismissKey(queue[i])
        if (readSeen(key)) continue
        const dismissed = readDismissRecord(key)
        if (!dismissed || dismissed.hideUntil <= Date.now()) {
          next = i
          break
        }
      }

      if (next !== -1) {
        setCurrentIndex(next)
        setDontShowAgain(false)
      } else {
        setIsOpen(false)
        setDontShowAgain(false)
      }
    },
    [current, currentIndex, queue, hideHours]
  )

  if (!current) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => advance(dontShowAgain)}
          />

          <div className="relative z-[61] w-full max-w-3xl px-3 sm:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={getDismissKey(current)}
                initial={{ opacity: 0, scale: 0.92, y: 22 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 22 }}
                transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                className="relative overflow-hidden rounded-[28px] bg-white/95 dark:bg-neutral-950/90 shadow-2xl border border-white/60 dark:border-white/10 backdrop-blur-xl"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.15),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_40%)] pointer-events-none" />

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => advance(dontShowAgain)}
                  className="absolute right-3 top-3 z-10 rounded-full bg-black/60 text-white p-2 hover:bg-black/70 transition-colors"
                  aria-label="ปิด popup"
                >
                  <X size={18} />
                </motion.button>

                <div className="relative">
                  <div className="overflow-hidden rounded-2xl m-3 sm:m-4 bg-black/5 dark:bg-white/5">
                    <motion.img
                      key={current.imageUrl}
                      src={current.imageUrl}
                      alt={current.title || 'ประกาศ'}
                      className="w-full h-full max-h-[80vh] object-contain"
                      initial={{ scale: 1.02 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
                    />
                  </div>

                  <div className="px-4 sm:px-6 pb-5 sm:pb-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 bg-black/55 text-white border border-white/10 shadow-sm">
                        <Megaphone size={16} className="text-white/90" />
                        <span className="text-sm font-semibold">
                          {queue.length > 1 ? `ประกาศ ${currentIndex + 1}/${queue.length}` : 'ประกาศ'}
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-3 rounded-full px-3 py-2 bg-white/75 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm hover:bg-white/85 dark:hover:bg-white/10 transition-colors select-none cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-5 w-5 appearance-none rounded-md border border-black/20 dark:border-white/20 bg-white/70 dark:bg-white/10 shadow-inner transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 checked:bg-indigo-600 checked:border-indigo-400 checked:shadow checked:shadow-indigo-500/30 before:content-[''] before:absolute before:left-[6px] before:top-[2px] before:h-[10px] before:w-[6px] before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:opacity-0 checked:before:opacity-100"
                          checked={dontShowAgain}
                          onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          <Clock3 size={15} className="text-indigo-600/90 dark:text-indigo-300" />
                          ไม่ต้องแสดงอีก
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">(ซ่อน {hideHours} ชม.)</span>
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        {queue.length > 1 && currentIndex < queue.length - 1 && (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => advance(dontShowAgain)}
                            className="px-5 py-2.5 rounded-full bg-white/85 text-neutral-900 text-sm font-semibold shadow hover:bg-white dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 transition-colors"
                          >
                            ถัดไป
                          </motion.button>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => advance(dontShowAgain)}
                          className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-semibold shadow hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-gray-100 transition-colors"
                        >
                          ปิด
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
