'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Database, WifiOff, RefreshCw } from 'lucide-react'

export function SystemStatus() {
  const pathname = usePathname()
  const [status, setStatus] = useState<'ok' | 'error' | 'checking'>('checking')
  const [details, setDetails] = useState<string>('')
  const [isVisible, setIsVisible] = useState(false)

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      if (!res.ok) {
        setStatus('error')
        if (res.status === 503) {
          setDetails(`ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Error ${res.status})`)
        } else {
          setDetails(`เกิดข้อผิดพลาดในการเชื่อมต่อ (Error ${res.status})`)
        }
        setIsVisible(true)
      } else {
        // If recovered from error, notify app to reload settings
        if (status === 'error') {
          try {
            const body = await res.json().catch(() => ({}))
            if (body.database === 'reconnected') {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('db:reconnected'))
              }
            }
          } catch (e) {
            // ignore
          }
          setIsVisible(false)
        }
        setStatus('ok')
        setDetails('')
      }
    } catch (error) {
      setStatus('error')
      setDetails('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ (Network Error)')
      setIsVisible(true)
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (pathname === '/login') return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-0 left-0 right-0 z-100 p-4 flex justify-center pointer-events-none mt-4"
        >
          <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto max-w-md w-full border border-red-400/50">
            <div className="p-3 bg-white/20 rounded-xl animate-pulse">
              {details.includes('ฐานข้อมูล') ? <Database size={24} /> : <WifiOff size={24} />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle size={18} />
                แจ้งเตือนระบบ
              </h3>
              <p className="text-red-100 text-sm font-medium">
                {details}
              </p>
            </div>
            <button 
              onClick={checkHealth}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="ลองเชื่อมต่อใหม่"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
