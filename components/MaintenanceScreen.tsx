'use client'

import { motion } from 'framer-motion'
import { Wrench, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
interface MaintenanceScreenProps {
  message?: string
  endTime?: string
}

export default function MaintenanceScreen({ message, endTime }: MaintenanceScreenProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!endTime) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const distance = end - now

      if (distance < 0) {
        clearInterval(interval)
        setTimeLeft('เปิดใช้งานแล้ว')
        window.location.reload()
        return
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeLeft(`${days > 0 ? days + ' ' + 'วัน' + ' ' : ''}${hours} ${'ชม.'} ${minutes} ${'นาที'} ${seconds} ${'วินาที'}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 text-center border border-neutral-200 dark:border-neutral-800"
      >
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600 dark:text-orange-400">
          <Wrench size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
          {'ระบบปิดปรับปรุงชั่วคราว'}
        </h1>
        
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 whitespace-pre-wrap">
          {message || 'ขออภัยในความไม่สะดวก เรากำลังพัฒนาระบบให้ดียิ่งขึ้น\nกรุณาลองใหม่อีกครั้งในภายหลัง'}
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 bg-neutral-100 dark:bg-neutral-800 py-3 px-4 rounded-xl">
          <Clock size={16} />
          <span>{timeLeft ? `${'จะเปิดใช้งานใน'}: ${timeLeft}` : 'คาดว่าจะเปิดใช้งานเร็วๆ นี้'}</span>
        </div>
      </motion.div>
    </div>
  )
}
