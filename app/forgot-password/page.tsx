'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, ArrowRight, Shield, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setError('กรุณากรอกอีเมล')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.error === 'invalid_email') {
          setError('รูปแบบอีเมลไม่ถูกต้อง')
          return
        }
        if (data?.error === 'email_not_found') {
          setError('ไม่พบอีเมลนี้ในระบบ')
          return
        }
        if (data?.error === 'rate_limited') {
          const waitSeconds = Number(data?.waitSeconds || 0)
          const waitMinutes = Math.ceil(waitSeconds / 60)
          setError(`ส่งอีเมลบ่อยเกินไป ลองใหม่อีก ${waitMinutes} นาที`)
          return
        }
        toast.error('ไม่สามารถส่งอีเมลได้')
        return
      }

      toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว')
      setEmail('')
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งอีเมล')
    } finally {
      setLoading(false)
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[360px]"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative rounded-[2.2rem] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden"
        >
          <div className="px-6 pt-7 pb-5 border-b border-slate-200/70 dark:border-white/10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.35),_transparent_58%)] bg-slate-950 text-white">
            <motion.div variants={itemVariants} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Reset</p>
                  <h2 className="text-2xl font-semibold">ลืมรหัสผ่าน</h2>
                </div>
              </div>
            </motion.div>
            <motion.p variants={itemVariants} className="mt-4 text-sm text-white/70">
              ใส่อีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่
            </motion.p>
          </div>

          <div className="p-6 md:p-6 bg-gradient-to-b from-slate-950/30 via-transparent to-transparent">
            <form onSubmit={handleSubmit} className="space-y-6 max-w-[280px] mx-auto" noValidate>
              <motion.div variants={itemVariants} className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className={`transition-colors ${error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-emerald-500'}`} />
                  </div>
                  <motion.input
                    animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    autoComplete="email"
                    className={`block w-full pl-12 pr-4 py-3.5 rounded-2xl border bg-white/95 dark:bg-neutral-900/60 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm ${
                      error
                        ? 'border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200/80 dark:border-white/10 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-sm flex items-center gap-1.5 font-medium ml-2"
                    >
                      <AlertCircle size={14} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3 text-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-emerald-500 text-white px-7 py-3 font-semibold text-sm shadow-xl hover:shadow-2xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 mx-auto"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      ส่งลิงก์
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>

                <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>กลับไปหน้าเข้าสู่ระบบ</span>
                  <Link
                    href="/login"
                    className="rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </div>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
