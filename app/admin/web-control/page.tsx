'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Key,
  Plus,
  Power,
  RefreshCw,
  Copy,
  Trash2,
  Pencil,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle
} from 'lucide-react'

type Offweb = {
  isOff: boolean
  message: string
  updatedAt?: string
}

type ApiKeyRow = {
  id: string
  name: string
  apiKeyPrefix: string
  isActive: boolean
  lastSeen: string | null
  lastIp: string | null
  createdAt: string
  updatedAt: string
}

function formatRelativeTime(input: string | null) {
  if (!input) return '—'
  const ts = new Date(input).getTime()
  if (!Number.isFinite(ts)) return '—'
  const diff = Date.now() - ts
  const sec = Math.round(diff / 1000)
  if (sec < 0) return '—'
  if (sec < 60) return `${sec} วิ.`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} นาที`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} ชม.`
  const day = Math.round(hr / 24)
  return `${day} วัน`
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false
  const ts = new Date(lastSeen).getTime()
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts <= 60_000
}

export default function WebControlAdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [offweb, setOffweb] = useState<Offweb>({ isOff: false, message: '' })
  const [keys, setKeys] = useState<ApiKeyRow[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<ApiKeyRow | null>(null)
  const [editingName, setEditingName] = useState('')

  const stats = useMemo(() => {
    const total = keys.length
    const active = keys.filter(k => k.isActive).length
    const online = keys.filter(k => k.isActive && isOnline(k.lastSeen)).length
    return { total, active, online, offline: Math.max(0, active - online) }
  }, [keys])

  const fetchAll = async () => {
    const [offRes, keysRes] = await Promise.all([
      fetch('/api/admin/web-control/offweb', { cache: 'no-store' }),
      fetch('/api/admin/web-control/api-keys', { cache: 'no-store' })
    ])

    if (offRes.ok) {
      const data = await offRes.json()
      setOffweb({ isOff: Boolean(data?.isOff), message: String(data?.message || ''), updatedAt: data?.updatedAt })
    }

    if (keysRes.ok) {
      const data = await keysRes.json()
      setKeys(Array.isArray(data?.keys) ? data.keys : [])
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
      router.push('/')
      return
    }

    fetchAll()
      .catch(() => toast.error('ไม่สามารถโหลดข้อมูลได้'))
      .finally(() => setLoading(false))
  }, [session, status, router])

  const doRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchAll()
      toast.success('รีเฟรชแล้ว')
    } catch {
      toast.error('รีเฟรชไม่สำเร็จ')
    } finally {
      setRefreshing(false)
    }
  }

  const saveOffweb = async () => {
    try {
      const res = await fetch('/api/admin/web-control/offweb', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOff: offweb.isOff, message: offweb.message })
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      setOffweb({ isOff: Boolean(data?.isOff), message: String(data?.message || ''), updatedAt: data?.updatedAt })
      toast.success('บันทึกสถานะแล้ว')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  const createKey = async () => {
    try {
      const name = newName.trim()
      if (!name) {
        toast.error('กรุณากรอกชื่อเว็บหลัก')
        return
      }

      const res = await fetch('/api/admin/web-control/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(String(data?.error || 'สร้างคีย์ไม่สำเร็จ'))
        return
      }

      setCreatedApiKey(String(data?.apiKey || ''))
      setNewName('')
      await fetchAll()
      toast.success('สร้างคีย์แล้ว')
    } catch {
      toast.error('สร้างคีย์ไม่สำเร็จ')
    }
  }

  const toggleKey = async (id: string, next: boolean) => {
    try {
      const res = await fetch(`/api/admin/web-control/api-keys/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next })
      })
      if (!res.ok) throw new Error('toggle failed')
      await fetchAll()
    } catch {
      toast.error('อัปเดตสถานะคีย์ไม่สำเร็จ')
    }
  }

  const openEdit = (row: ApiKeyRow) => {
    setEditing(row)
    setEditingName(row.name)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    try {
      const name = editingName.trim()
      const res = await fetch(`/api/admin/web-control/api-keys/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error('edit failed')
      setEditOpen(false)
      setEditing(null)
      await fetchAll()
      toast.success('บันทึกแล้ว')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  const deleteKey = async (row: ApiKeyRow) => {
    if (!confirm(`ลบ API Key ของ "${row.name}" ?`)) return
    try {
      const res = await fetch(`/api/admin/web-control/api-keys/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      await fetchAll()
      toast.success('ลบแล้ว')
    } catch {
      toast.error('ลบไม่สำเร็จ')
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('คัดลอกแล้ว')
    } catch {
      toast.error('คัดลอกไม่สำเร็จ')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <RefreshCw className="animate-spin" size={18} />
          กำลังโหลด...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-white/20 dark:border-neutral-800 hover:shadow-md transition"
            >
              <ArrowLeft size={18} />
              กลับ
            </Link>
            <div>
              <div className="text-xl sm:text-2xl font-bold">ควบคุมเปิด-ปิดเว็บไซต์</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">สำหรับเว็บหลักหลายเว็บด้วย API Key</div>
            </div>
          </div>

          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-white/20 dark:border-neutral-800 hover:shadow-md transition disabled:opacity-60"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            รีเฟรช
          </button>
        </div>

        {/* Offweb card */}
        <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/20 dark:border-neutral-800 shadow-lg p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Power size={18} />
                สถานะเว็บไซต์ (เว็บหลักทั้งหมด)
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                เมื่อปิดเว็บ = เว็บหลักจะถูก redirect ไปหน้า /maintenance
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${offweb.isOff ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                {offweb.isOff ? 'ปิดเว็บ' : 'เปิดเว็บ'}
              </span>
              <button
                type="button"
                onClick={() => setOffweb((s) => ({ ...s, isOff: !s.isOff }))}
                className={`w-12 h-7 rounded-full relative transition-colors shrink-0 cursor-pointer ${offweb.isOff ? 'bg-orange-500' : 'bg-emerald-500'}`}
                aria-label="toggle offweb"
              >
                <span className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all ${offweb.isOff ? 'left-6' : 'left-1'}`}></span>
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              ข้อความตอนปิดเว็บ
            </label>
            <textarea
              value={offweb.message}
              onChange={(e) => setOffweb((s) => ({ ...s, message: e.target.value }))}
              rows={3}
              className="w-full rounded-2xl bg-white/60 dark:bg-neutral-950/30 border border-slate-200/60 dark:border-neutral-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="เช่น ปิดปรับปรุงระบบ"
            />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                อัปเดตล่าสุด: {offweb.updatedAt ? new Date(offweb.updatedAt).toLocaleString('th-TH') : '—'}
              </div>
              <button
                onClick={saveOffweb}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
              >
                <CheckCircle2 size={18} />
                บันทึก
              </button>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/20 dark:border-neutral-800 shadow-lg p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Key size={18} />
                API Keys
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Online = เรียก /api/web-status ภายใน 1 นาที
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300">
                ทั้งหมด {stats.total}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                Online {stats.online}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300">
                Offline {stats.offline}
              </span>
              <button
                onClick={() => { setCreateOpen(true); setCreatedApiKey(null) }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-white/20 dark:border-neutral-800 hover:shadow-md transition"
              >
                <Plus size={18} />
                สร้างคีย์
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-neutral-800">
                  <th className="py-3 pr-4">สถานะ</th>
                  <th className="py-3 pr-4">ชื่อเว็บหลัก</th>
                  <th className="py-3 pr-4">Prefix</th>
                  <th className="py-3 pr-4">Online</th>
                  <th className="py-3 pr-4">IP ล่าสุด</th>
                  <th className="py-3 pr-4">การทำงาน</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const online = k.isActive && isOnline(k.lastSeen)
                  return (
                    <tr key={k.id} className="border-b border-slate-200/40 dark:border-neutral-800/70">
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${k.isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
                          {k.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {k.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{k.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600 dark:text-slate-300">{k.apiKeyPrefix}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${online ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
                          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                          {online ? `Online (${formatRelativeTime(k.lastSeen)})` : `Offline (${formatRelativeTime(k.lastSeen)})`}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{k.lastIp || '—'}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleKey(k.id, !k.isActive)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${k.isActive ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/25' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'}`}
                          >
                            {k.isActive ? 'ปิดคีย์' : 'เปิดคีย์'}
                          </button>
                          <button
                            onClick={() => openEdit(k)}
                            className="p-2 rounded-xl bg-white/60 dark:bg-neutral-950/20 border border-slate-200/60 dark:border-neutral-800 hover:shadow transition"
                            title="แก้ชื่อ"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteKey(k)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20 hover:bg-red-500/20 transition"
                            title="ลบ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                      ยังไม่มี API Key
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCreateOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl p-5"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">สร้าง API Key</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">คีย์จะถูกแสดงเพียงครั้งเดียว</div>
                </div>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
                  aria-label="close"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold">ชื่อเว็บหลัก</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น main-web-1"
                  className="w-full rounded-2xl bg-white dark:bg-neutral-950/20 border border-slate-200 dark:border-neutral-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                />

                <button
                  onClick={createKey}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
                >
                  <Plus size={18} />
                  สร้าง
                </button>

                {createdApiKey && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">API Key</div>
                    <div className="mt-1 font-mono text-xs break-all text-slate-800 dark:text-slate-100">{createdApiKey}</div>
                    <button
                      onClick={() => copyText(createdApiKey)}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 dark:bg-neutral-950/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:shadow transition"
                    >
                      <Copy size={16} />
                      คัดลอก
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Key Modal */}
      <AnimatePresence>
        {editOpen && editing && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl p-5"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">แก้ไขชื่อ</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Prefix: <span className="font-mono">{editing.apiKeyPrefix}</span>
                  </div>
                </div>
                <button
                  onClick={() => setEditOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
                  aria-label="close"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold">ชื่อเว็บหลัก</label>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full rounded-2xl bg-white dark:bg-neutral-950/20 border border-slate-200 dark:border-neutral-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <button
                  onClick={saveEdit}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
                >
                  <CheckCircle2 size={18} />
                  บันทึก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
