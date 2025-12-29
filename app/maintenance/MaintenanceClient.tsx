'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Wrench, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BackgroundManager } from '@/components/BackgroundManager'

export default function MaintenanceClient() {
  const searchParams = useSearchParams()
  const page = searchParams.get('page') || ''
  const [message, setMessage] = useState('หน้านี้กำลังปิดปรับปรุง กรุณาลองใหม่อีกครั้ง')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMaintenanceMessage = async () => {
      try {
        const res = await fetch('/api/access')
        if (res.ok) {
          const pages = await res.json()
          const pageData = pages.find((p: any) => {
            const pathMap: Record<string, string> = {
              'จัดการผู้ใช้': '/admin',
              'จัดการไฟล์': '/admin/files',
              'จัดการผู้ดูแล': '/admin/users',
              'จัดการหมวดหมู่': '/admin/categories',
              'จัดการการเข้าถึง': '/admin/access',
              'โปรไฟล์': '/profile',
              'ตั้งค่า': '/settings'
            }
            return pathMap[p.page] === page
          })

          if (pageData && pageData.isMaintenance && pageData.maintenanceMessage) {
            setMessage(pageData.maintenanceMessage)
          }
        }
      } catch (error) {
        console.error('Failed to fetch maintenance message:', error)
      } finally {
        setLoading(false)
      }
    }

    if (page) {
      fetchMaintenanceMessage()
    } else {
      setLoading(false)
    }
  }, [page])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-lg w-full relative z-10"
      >
        <div className="bg-neutral-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-neutral-800 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl"></div>
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
              className="w-24 h-24 bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-600 rounded-3xl blur-lg opacity-75 animate-pulse"></div>
              <Wrench size={48} className="text-white relative z-10 drop-shadow-lg" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent text-center mb-6"
            >
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-neutral-800/50 rounded-2xl p-6 mb-8 border border-neutral-700/50"
            >
              <p className="text-neutral-200 text-center leading-relaxed text-lg">
                {message}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800">
                <Clock size={18} className="text-orange-600 dark:text-orange-400" />
                <span className="text-orange-700 dark:text-orange-300 font-medium">ระบบกำลังปรับปรุง</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link
                href="/"
                className="group w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-500 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300 relative z-10" />
                <span className="relative z-10">กลับสู่หน้าหลัก</span>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-neutral-400 text-sm mt-6"
            >
              ขออภัยในความไม่สะดวก กรุณาลองใหม่อีกครั้งในภายหลัง
            </motion.p>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        /* No custom styles needed */
      `}</style>
      </div>
    </>
  )
}
