'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import toast from 'react-hot-toast'
import { Lock, User, AlertCircle, ArrowRight, Shield, CheckCircle2, Database, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [systemError, setSystemError] = useState<boolean>(false)
  const [errorDetails, setErrorDetails] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) {
          setSystemError(true)
          if (res.status === 503) {
            setErrorDetails(`ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Error ${res.status})`)
          } else {
            setErrorDetails(`เกิดข้อผิดพลาดในการเชื่อมต่อ (Error ${res.status})`)
          }
        } else {
          setSystemError(false)
        }
      } catch (error) {
        setSystemError(true)
        setErrorDetails('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ (Network Error)')
      }
    }
    checkHealth()

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.logoUrl) setLogoUrl(data.logoUrl)
      })
  }, [])

  const validateForm = () => {
    let isValid = true
    const newErrors = { username: '', password: '' }

    if (!username.trim()) {
      newErrors.username = 'โปรดกรอกชื่อผู้ใช้งาน'
      isValid = false
    }

    if (!password) {
      newErrors.password = 'โปรดกรอกรหัสผ่าน'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setLoading(true)

    // Check temporary lockout before attempting signIn
    try {
      const lockRes = await fetch(`/api/users/check-lock?username=${encodeURIComponent(username)}`, { cache: 'no-store' })
      if (lockRes.ok) {
        const data = await lockRes.json()
        if (data.locked) {
          toast.error(data.message || 'บัญชีถูกระงับชั่วคราว')
          setLoading(false)
          return
        }
      }
    } catch (err) {
      // ignore check errors and continue to signIn (fallback)
    }

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Map known NextAuth error codes to friendly Thai messages (no prefix)
        if (result.error === 'CredentialsSignin') {
          toast.error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        } else if (result.error === 'AccessDenied') {
          toast.error('ไม่มีสิทธิ์เข้าถึง')
        } else if (result.error === 'SessionRequired') {
          toast.error('กรุณาเข้าสู่ระบบก่อน')
        } else {
          // Fallback: show raw error message without the "เข้าสู่ระบบไม่สำเร็จ:" prefix
          toast.error(String(result.error))
        }
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ')
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด')
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
        delayChildren: 0.3
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl p-8 md:p-12 rounded-[2rem] shadow-2xl border border-white/20 dark:border-neutral-800 relative overflow-hidden"
        >
          
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/10 blur-3xl -z-10"></div>

          {!systemError && (
            <div className="flex flex-col items-center mb-10">
              <motion.div 
                variants={itemVariants}
                className="w-24 h-24 mb-6 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl flex items-center justify-center p-4 border border-gray-100 dark:border-neutral-700"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Shield size={48} className="text-indigo-600 dark:text-indigo-400" />
                )}
              </motion.div>
              <motion.h1 variants={itemVariants} className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">{'ยินดีต้อนรับ'}</motion.h1>
              <motion.p variants={itemVariants} className="text-gray-500 dark:text-gray-400 text-center max-w-xs mx-auto leading-relaxed">
                {'กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ'}
              </motion.p>
            </div>
          )}

          {systemError ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-2 text-center w-full"
            >
              <div className="bg-red-500 text-white p-8 rounded-3xl shadow-lg w-full mb-8 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 opacity-20 rotate-12">
                  <AlertTriangle size={120} />
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white/20 p-4 rounded-2xl mb-4 backdrop-blur-sm shadow-inner">
                      {errorDetails.includes('ฐานข้อมูล') ? <Database size={32} /> : <WifiOff size={32} />}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">แจ้งเตือนระบบ</h3>
                  <p className="text-red-50 font-medium text-lg leading-relaxed">
                    {errorDetails}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <RefreshCw size={20} />
                ลองเชื่อมต่อใหม่
              </button>
            </motion.div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <motion.div variants={itemVariants} className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <User size={20} className={`transition-colors ${errors.username ? 'text-red-500' : 'text-gray-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'}`} />
                </div>
                <motion.input
                  animate={errors.username ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (errors.username) setErrors({ ...errors, username: '' })
                  }}
                  autoComplete="username"
                  className={`block w-full pl-14 pr-6 py-4 bg-gray-100/50 dark:bg-neutral-800/50 border rounded-full outline-none transition-all duration-200 font-medium ${
                    errors.username 
                      ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/50' 
                      : 'border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  } text-gray-900 dark:text-white placeholder-gray-400`}
                  placeholder={'กรอกชื่อผู้ใช้'}
                />
              </div>
              <AnimatePresence>
                {errors.username && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-sm flex items-center gap-1.5 font-medium ml-4"
                  >
                    <AlertCircle size={14} />
                    {errors.username}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Lock size={20} className={`transition-colors ${errors.password ? 'text-red-500' : 'text-gray-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'}`} />
                </div>
                <motion.input
                  animate={errors.password ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: '' })
                  }}
                  autoComplete="current-password"
                  className={`block w-full pl-14 pr-6 py-4 bg-gray-100/50 dark:bg-neutral-800/50 border rounded-full outline-none transition-all duration-200 font-medium ${
                    errors.password 
                      ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/50' 
                      : 'border-transparent focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  } text-gray-900 dark:text-white placeholder-gray-400`}
                  placeholder={'กรอกรหัสผ่าน'}
                />
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-sm flex items-center gap-1.5 font-medium ml-4"
                  >
                    <AlertCircle size={14} />
                    {errors.password}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4 flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="px-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-40"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {'เข้าสู่ระบบ'}
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

