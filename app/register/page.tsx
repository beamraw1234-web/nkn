'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import toast from 'react-hot-toast'
import { AtSign, Lock, Shield, ArrowRight, Mail } from 'lucide-react'

type GrecaptchaApi = {
  render: (
    container: HTMLElement,
    parameters: {
      sitekey: string
      theme?: string
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    }
  ) => number
  reset?: (id?: number) => void
  ready?: (cb: () => void) => void
  enterprise?: GrecaptchaApi
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [captchaEnabled, setCaptchaEnabled] = useState(true)
  const [captchaSiteKey, setCaptchaSiteKey] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null)
  const recaptchaWidgetId = useRef<number | null>(null)

  const loadRecaptchaScript = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') return resolve()
      const existingApi = getRecaptchaApi()
      if (existingApi) return resolve()
      const existing = document.getElementById('recaptcha-script')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('recaptcha')))
        return
      }
      const script = document.createElement('script')
      script.id = 'recaptcha-script'
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('recaptcha'))
      document.body.appendChild(script)
    })

  const getRecaptchaApi = (): GrecaptchaApi | null => {
    if (typeof window === 'undefined') return null
    const grecaptcha = (window as typeof window & { grecaptcha?: GrecaptchaApi }).grecaptcha
    if (!grecaptcha) return null
    if (typeof grecaptcha.render === 'function') return grecaptcha
    if (grecaptcha.enterprise && typeof grecaptcha.enterprise.render === 'function') return grecaptcha.enterprise
    return null
  }

  const renderRecaptcha = () => {
    if (!captchaSiteKey || !recaptchaLoaded) return
    if (typeof window === 'undefined') return
    if (!recaptchaContainerRef.current) return
    if (recaptchaWidgetId.current !== null) return
    const api = getRecaptchaApi()
    if (!api) {
      window.setTimeout(() => {
        renderRecaptcha()
      }, 120)
      return
    }

    recaptchaWidgetId.current = api.render(recaptchaContainerRef.current, {
      sitekey: captchaSiteKey,
      theme: 'light',
      callback: (token: string) => setRecaptchaToken(token),
      'expired-callback': () => setRecaptchaToken(''),
      'error-callback': () => setRecaptchaToken('')
    })
  }

  useEffect(() => {
    const initCaptcha = async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const enabled = typeof data?.captchaEnabled === 'boolean' ? data.captchaEnabled : data?.captchaEnabled !== 'false'
          const siteKey = String(data?.captchaSiteKey || '')
          setCaptchaEnabled(enabled !== false)
          setCaptchaSiteKey(siteKey)
          if (enabled !== false && siteKey) {
            await loadRecaptchaScript()
            setRecaptchaLoaded(true)
          }
          return
        }
      } catch {
        // fall through to default behavior
      }
      setCaptchaEnabled(true)
    }

    initCaptcha()
  }, [])

  useEffect(() => {
    renderRecaptcha()
  }, [captchaSiteKey, recaptchaLoaded])


  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.username.trim()) nextErrors.username = 'กรุณากรอกชื่อผู้ใช้'
    if (!form.email.trim()) nextErrors.email = 'กรุณากรอกอีเมล'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    }
    if (!form.password) nextErrors.password = 'กรุณากรอกรหัสผ่าน'
    if (form.password && form.password.length < 8) nextErrors.password = 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'
    if (!form.confirmPassword) nextErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน'
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'
    }
    if (captchaEnabled && !captchaSiteKey) {
      nextErrors.captcha = 'ยังไม่ได้ตั้งค่า CAPTCHA กรุณาติดต่อผู้ดูแลระบบ'
    } else if (captchaEnabled && !recaptchaToken) {
      nextErrors.captcha = 'กรุณายืนยัน CAPTCHA'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        username: form.username,
        email: form.email,
        password: form.password
      }
      if (captchaEnabled) {
        payload.captchaToken = recaptchaToken
        payload.captchaProvider = 'recaptcha'
      }

      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}))
        if (data?.error === 'captcha_config_missing') {
          setErrors(prev => ({ ...prev, captcha: 'ยังไม่ได้ตั้งค่า CAPTCHA กรุณาติดต่อผู้ดูแลระบบ' }))
          return
        }
        if (data?.error === 'captcha_failed') {
          setErrors(prev => ({ ...prev, captcha: 'คำตอบไม่ถูกต้อง หรือหมดอายุ' }))
          const api = getRecaptchaApi()
          if (api && recaptchaWidgetId.current !== null) {
            api.reset?.(recaptchaWidgetId.current)
            setRecaptchaToken('')
          }
          return
        }
        if (data?.error === 'username_exists') {
          setErrors(prev => ({ ...prev, username: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }))
          return
        }
        if (data?.error === 'email_exists') {
          setErrors(prev => ({ ...prev, email: 'อีเมลนี้ถูกใช้แล้ว' }))
          return
        }
        if (data?.error === 'invalid_email') {
          setErrors(prev => ({ ...prev, email: 'รูปแบบอีเมลไม่ถูกต้อง' }))
          return
        }
        toast.error('สมัครสมาชิกไม่สำเร็จ')
        return
      }

      await new Promise(resolve => setTimeout(resolve, 600))
      toast.success('สมัครสมาชิกสำเร็จ กรุณายืนยันอีเมล')
      setForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      })
      const api = getRecaptchaApi()
      if (api && recaptchaWidgetId.current !== null) {
        api.reset?.(recaptchaWidgetId.current)
        setRecaptchaToken('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.08 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[480px]"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative rounded-[2.2rem] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden"
        >
          <div className="px-6 pt-7 pb-5 border-b border-slate-200/70 dark:border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_58%)] bg-slate-950 text-white">
            <motion.div variants={itemVariants} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Register</p>
                  <h2 className="text-2xl font-semibold">สมัครสมาชิก</h2>
                </div>
              </div>
            </motion.div>
            <motion.p variants={itemVariants} className="mt-4 text-sm text-white/70">
              สร้างบัญชีใหม่เพื่อเริ่มใช้งาน
            </motion.p>
          </div>

          <div className="p-6 md:p-6 bg-gradient-to-b from-slate-950/30 via-transparent to-transparent">
            <form onSubmit={handleSubmit} className="space-y-6 max-w-[380px] mx-auto" noValidate>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300">ชื่อผู้ใช้</label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <AtSign size={18} className="text-white/50" />
                      <input
                        value={form.username}
                        onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                        type="text"
                        className="w-full bg-transparent outline-none text-sm text-slate-100 placeholder:text-white/40"
                        placeholder="username"
                      />
                    </div>
                    <AnimatePresence>
                      {errors.username && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="mt-1 text-xs text-rose-500"
                        >
                          {errors.username}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300">อีเมล</label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <Mail size={18} className="text-white/50" />
                      <input
                        value={form.email}
                        onChange={(e) => {
                          setForm(prev => ({ ...prev, email: e.target.value }))
                          if (errors.email) setErrors(prev => ({ ...prev, email: '' }))
                        }}
                        type="email"
                        className="w-full bg-transparent outline-none text-sm text-slate-100 placeholder:text-white/40"
                        placeholder="you@example.com"
                      />
                    </div>
                    <AnimatePresence>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="mt-1 text-xs text-rose-500"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-300">รหัสผ่าน</label>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <Lock size={18} className="text-white/50" />
                        <input
                          value={form.password}
                          onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                          type="password"
                          className="w-full bg-transparent outline-none text-sm text-slate-100 placeholder:text-white/40"
                          placeholder="อย่างน้อย 8 ตัวอักษร"
                        />
                      </div>
                      <AnimatePresence>
                        {errors.password && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-1 text-xs text-rose-500"
                          >
                            {errors.password}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">ยืนยันรหัสผ่าน</label>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <Lock size={18} className="text-white/50" />
                        <input
                          value={form.confirmPassword}
                          onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          type="password"
                          className="w-full bg-transparent outline-none text-sm text-slate-100 placeholder:text-white/40"
                          placeholder="กรอกรหัสผ่านอีกครั้ง"
                        />
                      </div>
                      <AnimatePresence>
                        {errors.confirmPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-1 text-xs text-rose-500"
                          >
                            {errors.confirmPassword}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {captchaEnabled ? (
                  <>
                    {captchaSiteKey ? (
                      <div ref={recaptchaContainerRef} className="min-h-[78px] flex justify-center" />
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/60">
                        ยังไม่ได้ตั้งค่า CAPTCHA ในหน้าตั้งค่า
                      </div>
                    )}
                    <AnimatePresence>
                      {errors.captcha && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-xs text-rose-500 text-center"
                        >
                          {errors.captcha}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </>
                ) : null}

                {!captchaEnabled ? (
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-center text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.85)] leading-snug">
                    CAPTCHA ถูกปิดใช้งานโดยผู้ดูแลระบบ
                  </div>
                ) : null}

                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-emerald-500 text-white px-7 py-3 font-semibold text-sm shadow-xl hover:shadow-2xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 mx-auto"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                        กำลังส่งข้อมูล
                      </span>
                    ) : (
                      <>
                        สมัครสมาชิก
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>มีบัญชีอยู่แล้ว?</span>
                  <Link
                    href="/login"
                    className="rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </div>
              </form>
            </div>
          </motion.div>
      </motion.div>
    </div>
  )
}
