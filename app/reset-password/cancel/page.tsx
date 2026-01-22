'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, XCircle } from 'lucide-react'

export default function ResetCancelPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const cancel = async () => {
      if (!token) {
        setStatus('error')
        return
      }
      try {
        const res = await fetch(`/api/auth/reset-password/cancel?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
        if (!res.ok) {
          setStatus('error')
          return
        }
        setStatus('success')
      } catch {
        setStatus('error')
      }
    }
    cancel()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[360px]"
      >
        <div className="relative rounded-[2.2rem] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="px-6 pt-7 pb-5 border-b border-slate-200/70 dark:border-white/10 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.35),_transparent_58%)] bg-slate-950 text-white">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Reset</p>
                <h2 className="text-2xl font-semibold">ยกเลิกการรีเซ็ต</h2>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-6 bg-gradient-to-b from-slate-950/30 via-transparent to-transparent text-center">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-300">
                <div className="w-10 h-10 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                กำลังยกเลิกลิงก์...
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle size={40} className="text-emerald-500" />
                <div className="text-lg font-semibold text-slate-900 dark:text-white">ยกเลิกลิงก์สำเร็จ</div>
                <Link
                  href="/login"
                  className="rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <XCircle size={40} className="text-red-500" />
                <div className="text-lg font-semibold text-slate-900 dark:text-white">ลิงก์ไม่ถูกต้องหรือหมดอายุ</div>
                <Link
                  href="/login"
                  className="rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
