'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NotMeClient({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!token) {
      setError('ลิงก์ไม่ถูกต้อง (ไม่พบ token)')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/login-alert/not-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        const code = data?.error || 'unknown'
        if (code === 'token_used') setError('ลิงก์นี้ถูกใช้ไปแล้ว')
        else if (code === 'token_expired') setError('ลิงก์หมดอายุแล้ว')
        else if (code === 'invalid_token') setError('ลิงก์ไม่ถูกต้อง')
        else setError('ดำเนินการไม่สำเร็จ')
        return
      }

      setDone(true)
      setTimeout(() => router.replace('/login'), 800)
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-neutral-800 shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ยืนยันว่า “ไม่ใช่ฉัน”</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          หากคุณไม่ได้เป็นคนล็อกอิน ระบบจะบังคับให้บัญชีนี้ต้องเปลี่ยนรหัสผ่าน และรีโวคเซสชันที่กำลังใช้งานอยู่เพื่อความปลอดภัย
        </p>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 p-4">
            {error}
          </div>
        )}

        {done ? (
          <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 p-4">
            สำเร็จแล้ว — กำลังพาไปหน้าเข้าสู่ระบบ…
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold"
            >
              {loading ? 'กำลังดำเนินการ…' : 'ยืนยัน: ไม่ใช่ฉัน'}
            </button>
            <button
              onClick={() => router.replace('/')}
              className="h-12 px-5 rounded-2xl bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold"
            >
              ยกเลิก
            </button>
          </div>
        )}

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          หมายเหตุ: หากคุณเป็นคนล็อกอินเอง ให้กด “ยกเลิก” ได้เลย
        </p>
      </div>
    </div>
  )
}
