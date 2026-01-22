'use client'

import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ForceChangePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [infoLoading, setInfoLoading] = useState(true)
  const [reason, setReason] = useState<string>('')
  type ForcePasswordMeta = {
    latitude?: number
    longitude?: number
    ip?: string
    city?: string
    region?: string
    country?: string
    mapUrl?: string
  }
  const [meta, setMeta] = useState<ForcePasswordMeta | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const embedUrl = useMemo(() => {
    const lat = meta?.latitude
    const lon = meta?.longitude
    if (typeof lat !== 'number' || typeof lon !== 'number') return null
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lon}`)}&z=14&output=embed`
  }, [meta])

  useEffect(() => {
    const run = async () => {
      setInfoLoading(true)
      try {
        const res = await fetch('/api/auth/validate', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const r = String(data?.forcePasswordChangeReason || '')
        setReason(
          r ||
            'เพื่อความปลอดภัย ระบบต้องการให้คุณเปลี่ยนรหัสผ่านก่อนใช้งานต่อ'
        )
        setMeta(data?.forcePasswordChangeMeta || null)
      } catch {
        setReason('เพื่อความปลอดภัย ระบบต้องการให้คุณเปลี่ยนรหัสผ่านก่อนใช้งานต่อ')
        setMeta(null)
      } finally {
        setInfoLoading(false)
      }
    }
    run()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน')
      return
    }
    if (newPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'เปลี่ยนรหัสผ่านล้มเหลว')
        return
      }

      toast.success('เปลี่ยนรหัสผ่านสำเร็จ')

      // Sign out to ensure old JWT cookies are cleared client-side.
      await signOut({ redirect: false })
      router.replace('/login')
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-neutral-800 shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">จำเป็นต้องเปลี่ยนรหัสผ่าน</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          เพื่อความปลอดภัย ระบบต้องการให้คุณเปลี่ยนรหัสผ่านก่อนใช้งานต่อ
        </p>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">เหตุผล</div>
              <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-line">
                {infoLoading ? 'กำลังโหลดรายละเอียด…' : reason}
              </div>
            </div>

            {(meta?.ip || meta?.city || meta?.country || meta?.mapUrl || embedUrl) && (
              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/20 p-4">
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">ตำแหน่งโดยประมาณจาก IP</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {meta?.ip ? <div>IP: {String(meta.ip)}</div> : null}
                  {(meta?.city || meta?.region || meta?.country) ? (
                    <div>
                      สถานที่: {[meta?.city, meta?.region, meta?.country].filter(Boolean).join(', ') || '-'}
                    </div>
                  ) : null}
                </div>

                {embedUrl ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 dark:border-white/10">
                    <iframe
                      title="map"
                      src={embedUrl}
                      className="w-full h-56"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : meta?.mapUrl ? (
                  <a
                    href={String(meta.mapUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
                  >
                    เปิดแผนที่
                  </a>
                ) : null}
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              ถัดไป
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/30 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/30 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/30 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="new-password"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-12 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold"
              >
                {loading ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
