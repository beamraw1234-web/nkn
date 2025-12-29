'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Moon, Bell, Globe, Shield, Lock, Unlock, Sun, Image as ImageIcon, Upload, X, ChevronRight, AlertTriangle, Power, Megaphone, Snowflake, Star, Zap, Heart, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from 'next-themes'

// Custom hook to manage body overflow when modal is open
const useModalBodyLock = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [securityEnabled, setSecurityEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [notifyOnLogin, setNotifyOnLogin] = useState(false)
  const [testingNotification, setTestingNotification] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('')
  
  const [announcement, setAnnouncement] = useState('')
  const [announcementIcon, setAnnouncementIcon] = useState('Megaphone')
  const [announcementColor, setAnnouncementColor] = useState('#06b6d4')
  const [announcementSpeed, setAnnouncementSpeed] = useState(20)
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false)
  const [backgroundType, setBackgroundType] = useState('grid')
  const [backgroundValue, setBackgroundValue] = useState('')
  const [backgroundGridColor, setBackgroundGridColor] = useState('#888888')
  const [backgroundGridAlpha, setBackgroundGridAlpha] = useState(0.06)
  const [backgroundGridAuto, setBackgroundGridAuto] = useState(true)
  const [backgroundBlur, setBackgroundBlur] = useState(0)
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false)
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60)
  const [isSessionTimeoutModalOpen, setIsSessionTimeoutModalOpen] = useState(false)
  const [weatherEffect, setWeatherEffect] = useState('none')
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false)
  const [weatherSpeed, setWeatherSpeed] = useState(1)
  const [weatherColor, setWeatherColor] = useState('#ffffff')
  const [weatherIntensity, setWeatherIntensity] = useState(1)
  const [weatherSound, setWeatherSound] = useState(false)


  // Lock body when any modal is open
  const anyModalOpen = isLogoModalOpen || isNotificationModalOpen || isMaintenanceModalOpen || isAnnouncementModalOpen || isBackgroundModalOpen || isSessionTimeoutModalOpen || isWeatherModalOpen
  useModalBodyLock(anyModalOpen)

  useEffect(() => {
    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, router])

  useEffect(() => {
    setMounted(true)
    console.log('Session:', session)
    console.log('Role:', session?.user?.role)
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSecurityEnabled(data.enabled)
        setLogoUrl(data.logoUrl || '')
        setDiscordWebhookUrl(data.discordWebhookUrl || '')
        setNotifyOnLogin(data.notifyOnLogin || false)
        setMaintenanceMode(data.maintenanceMode || false)
        setMaintenanceMessage(data.maintenanceMessage || '')
        setMaintenanceEndTime(data.maintenanceEndTime || '')
        setBackgroundType(data.backgroundType || 'grid')
        setBackgroundValue(data.backgroundValue || '')
        setBackgroundGridColor(data.backgroundGridColor || '#888888')
        setBackgroundGridAlpha(data.backgroundGridAlpha ? parseFloat(data.backgroundGridAlpha) : 0.06)
        setBackgroundGridAuto(typeof data.backgroundGridAuto !== 'undefined' ? Boolean(data.backgroundGridAuto) : true)
        setBackgroundBlur(data.backgroundBlur ? parseFloat(data.backgroundBlur) : 0)
        setSessionTimeoutMinutes(data.sessionTimeoutMinutes || 60)
        setWeatherEffect(data.weatherEffect || 'none')
        setWeatherSpeed(data.weatherSpeed || 1)
        setWeatherColor(data.weatherColor || '#ffffff')
        setWeatherIntensity(data.weatherIntensity || 1)
        setWeatherSound(data.weatherSound || false)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/announcement')
      .then(res => res.json())
      .then(data => {
        if (data.content) setAnnouncement(data.content)
        if (data.icon) setAnnouncementIcon(data.icon)
        if (data.color) setAnnouncementColor(data.color)
        if (data.speed) setAnnouncementSpeed(data.speed)
      })
  }, [])

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      const data = await res.json()
      const newUrl = data.url
      
      // Save immediately with the new URL
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundType: 'image',
          backgroundValue: newUrl,
          backgroundGridColor,
          backgroundGridAlpha,
          backgroundGridAuto,
          backgroundBlur
        })
      })
      
      // Update state after successful save
      setBackgroundValue(newUrl)
      setBackgroundType('image')
      toast.success('อัปโหลดรูปภาพสำเร็จ')
      setIsBackgroundModalOpen(false)
      window.location.reload()
    } catch (error) {
      toast.error('อัปโหลดล้มเหลว')
    } finally {
      setUploading(false)
    }
  }

  const saveBackgroundSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundType,
          backgroundValue,
          backgroundGridColor,
          backgroundGridAlpha,
          backgroundGridAuto,
          backgroundBlur
        })
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      toast.success('บันทึกการตั้งค่าพื้นหลังแล้ว')
      setIsBackgroundModalOpen(false)
      window.location.reload()
    } catch (error) {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      const data = await res.json()
      setLogoUrl(data.url)
      await saveLogoSetting(data.url)
      toast.success('อัปโหลดโลโก้สำเร็จ')
    } catch (error) {
      toast.error('อัปโหลดล้มเหลว')
    } finally {
      setUploading(false)
    }
  }

  const saveLogoSetting = async (url: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: url }),
      })
    } catch (error) {
      console.error('Failed to save logo setting')
    }
  }

  const saveThemeSetting = async (newTheme: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
      toast.success(`เปลี่ยนธีมระบบเป็น ${newTheme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'}`)
    } catch (error) {
      console.error('Failed to save theme setting')
      toast.error('เปลี่ยนธีมระบบไม่สำเร็จ')
    }
  }

  /* Language switching removed - fixed to Thai */

  const saveAnnouncement = async () => {
    try {
      const res = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: announcement,
          icon: announcementIcon,
          color: announcementColor,
          speed: announcementSpeed
        }),
      })
      
      if (res.ok) {
        toast.success('บันทึกประกาศสำเร็จ')
        setIsAnnouncementModalOpen(false)
      } else {
        toast.error('บันทึกไม่สำเร็จ')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  const saveNotificationSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          discordWebhookUrl,
          notifyOnLogin
        }),
      })
      toast.success('บันทึกการตั้งค่าการแจ้งเตือนแล้ว')
      setIsNotificationModalOpen(false)
    } catch (error) {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  const handleTestNotification = async () => {
    if (!discordWebhookUrl) {
      toast.error('กรุณาระบุ Webhook URL ก่อนทดสอบ')
      return
    }
    
    setTestingNotification(true)
    try {
      const res = await fetch('/api/settings/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: discordWebhookUrl })
      })
      
      if (res.ok) {
        toast.success('ส่งข้อความทดสอบสำเร็จ')
      } else {
        throw new Error('Failed')
      }
    } catch (error) {
      toast.error('ส่งข้อความทดสอบล้มเหลว')
    } finally {
      setTestingNotification(false)
    }
  }

  const saveMaintenanceSettings = async () => {
    if (session?.user?.role !== 'ADMIN') return

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maintenanceMode,
          maintenanceMessage,
          maintenanceEndTime
        }),
      })
      toast.success('บันทึกการตั้งค่าโหมดปิดปรับปรุงแล้ว')
      setIsMaintenanceModalOpen(false)
    } catch (error) {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  const toggleSecurity = async () => {
    if (session?.user?.role !== 'ADMIN') {
      toast.error('สำหรับผู้ดูแลระบบเท่านั้น')
      return
    }

    const newState = !securityEnabled
    setSecurityEnabled(newState)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      })
      
      if (res.ok) {
        toast.success(newState ? 'ระบบความปลอดภัย เปิดใช้งาน' : 'ระบบความปลอดภัย ปิดใช้งาน')
      } else {
        setSecurityEnabled(!newState)
        toast.error('เกิดข้อผิดพลาดในการอัปเดต')
      }
    } catch (error) {
      setSecurityEnabled(!newState)
      toast.error('เกิดข้อผิดพลาดในการอัปเดต')
    }
  }

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center px-4 py-2 bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all mb-6 group border border-gray-200 dark:border-neutral-800">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          {'กลับหน้าหลัก'}
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-neutral-800"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">ตั้งค่า</h1>
          
          {/* Grid view matching design (3x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {session?.user?.role === 'ADMIN' && (
              <>
                <button type="button" onClick={() => setIsLogoModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
                  <div className="text-center">
                    <div className="w-48 h-24 rounded-md flex items-center justify-center mx-auto overflow-hidden bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <ImageIcon size={36} />
                      )}
                    </div>
                    <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">เปลี่ยนโลโก้</div>
                  </div>
                </button>

                <button type="button" onClick={() => setIsAnnouncementModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
                  <div className="text-center">
                    <div className="w-48 h-24 flex items-center justify-center mx-auto">
                      <Megaphone size={36} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">ประกาศจากแอดมิน</div>
                  </div>
                </button>

                <button type="button" onClick={() => setIsBackgroundModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
                  <div className="text-center">
                    <div className="w-48 h-24 flex items-center justify-center mx-auto">
                      <Monitor size={36} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">พื้นหลังเว็บไซต์</div>
                  </div>
                </button>

                <button type="button" onClick={() => setIsMaintenanceModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
                  <div className="text-center">
                    <div className="w-48 h-24 flex items-center justify-center mx-auto">
                      <AlertTriangle size={36} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">โหมดปิดปรับปรุง</div>
                  </div>
                </button>
              </>
            )}

            {/* Common cards */}
            <button type="button" onClick={() => {
                const newTheme = isDark ? 'light' : 'dark'
                setTheme(newTheme)
                if (session?.user?.role === 'ADMIN') saveThemeSetting(newTheme)
              }}
              className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
              <div className="text-center">
                <div className="w-48 h-24 flex items-center justify-center mx-auto">
                  {isDark ? <Sun size={36} /> : <Moon size={36} />}
                </div>
                <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">ธีม</div>
              </div>
            </button>

            <button type="button" onClick={() => setIsNotificationModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
              <div className="text-center">
                <div className="w-48 h-24 flex items-center justify-center mx-auto">
                  <Bell size={36} />
                </div>
                <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">การแจ้งเตือน</div>
              </div>
            </button>


            <button type="button" onClick={toggleSecurity} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
              <div className="text-center">
                <div className="w-48 h-24 flex items-center justify-center mx-auto">
                  {securityEnabled ? <Lock size={36} /> : <Unlock size={36} />}
                </div>
                <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">ป้องกันกด F12 - {securityEnabled ? 'เปิด' : 'ปิด'}</div>
              </div>
            </button>

            {session?.user?.role === 'ADMIN' && (
              <>
                <button type="button" onClick={() => setIsSessionTimeoutModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
                  <div className="text-center">
                    <div className="w-48 h-24 flex items-center justify-center mx-auto">
                      <Power size={36} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">หมดอายุเซสชัน</div>
                  </div>
                </button>

                <button type="button" onClick={() => setIsWeatherModalOpen(true)} className="h-48 bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center cursor-pointer relative z-0">
                  <div className="text-center">
                    <div className="w-48 h-24 flex items-center justify-center mx-auto">
                      <Sun size={36} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">เอฟเฟกต์สภาพอากาศ</div>
                  </div>
                </button>
              </>
            )}

            {/* Language removed - fixed to Thai */}
          </div>

          <div>
            {/* Security Setting (Admin Only) */}
            {session?.user?.role === 'ADMIN' && (
              <>
                {/* Logo trigger removed - use card grid above */}

                {/* Logo Modal */}
                {isLogoModalOpen && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsLogoModalOpen(false)}
                  >
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg">เปลี่ยนโลโก้</h3>
                        <button 
                          onClick={() => setIsLogoModalOpen(false)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <div className="flex justify-center">
                          <div className="w-32 h-32 bg-gray-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 dark:border-neutral-700 relative group">
                            {logoUrl ? (
                              <img src={logoUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                            ) : (
                              <ImageIcon size={40} className="text-gray-300 dark:text-neutral-600" />
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <span className="text-white text-sm font-medium flex items-center gap-2">
                                <Upload size={16} /> เปลี่ยนโลโก้
                              </span>
                              <input
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleLogoUpload}
                                disabled={uploading}
                              />
                            </label>
                            {uploading && (
                              <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">หรือใส่ลิงก์โลโก้</label>
                          <input 
                            type="text" 
                            value={logoUrl ?? ''}
                            onChange={(e) => {
                              setLogoUrl(e.target.value)
                              saveLogoSetting(e.target.value)
                            }}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end">
                        <button
                          onClick={() => setIsLogoModalOpen(false)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                        >
                          เสร็จสิ้น
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Announcement trigger removed - use card grid above */}

                {/* Announcement Modal */}
                {isAnnouncementModalOpen && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsAnnouncementModalOpen(false)}
                  >
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg">แก้ไขประกาศ</h3>
                        <button 
                          onClick={() => setIsAnnouncementModalOpen(false)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ไอคอน</label>
                          <div className="flex gap-2">
                            {['Megaphone', 'Snowflake', 'Star', 'Zap', 'Heart', 'AlertTriangle'].map((icon) => (
                              <button
                                key={icon}
                                onClick={() => setAnnouncementIcon(icon)}
                                className={`p-3 rounded-xl border transition-all ${
                                  announcementIcon === icon 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-400' 
                                    : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                }`}
                              >
                                {icon === 'Megaphone' && <Megaphone size={20} />}
                                {icon === 'Snowflake' && <Snowflake size={20} />}
                                {icon === 'Star' && <Star size={20} />}
                                {icon === 'Zap' && <Zap size={20} />}
                                {icon === 'Heart' && <Heart size={20} />}
                                {icon === 'AlertTriangle' && <AlertTriangle size={20} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ข้อความประกาศ</label>
                          <textarea 
                            value={announcement ?? ''}
                            onChange={(e) => setAnnouncement(e.target.value)}
                            placeholder="พิมพ์ข้อความประกาศที่นี่..."
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">สีขอบและแสง</label>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { name: 'Cyan', value: '#06b6d4' },
                                { name: 'Red', value: '#ef4444' },
                                { name: 'Green', value: '#22c55e' },
                                { name: 'Yellow', value: '#eab308' },
                                { name: 'Purple', value: '#a855f7' },
                                { name: 'Pink', value: '#ec4899' },
                                { name: 'White', value: '#ffffff' },
                              ].map((color) => (
                                <button
                                  key={color.name}
                                  onClick={() => setAnnouncementColor(color.value)}
                                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                                    announcementColor === color.value 
                                      ? 'border-gray-900 dark:border-white scale-110' 
                                      : 'border-transparent hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ความเร็ว (วินาที)</label>
                            <div className="flex items-center gap-4">
                              <input 
                                type="range" 
                                min="5" 
                                max="60" 
                                step="1"
                                value={announcementSpeed ?? 20}
                                onChange={(e) => setAnnouncementSpeed(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700"
                              />
                              <span className="text-sm font-medium w-8">{announcementSpeed}s</span>
                            </div>
                            <p className="text-xs text-gray-500">ค่าน้อย = เร็ว, ค่ามาก = ช้า</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">
                        <button 
                          onClick={() => setIsAnnouncementModalOpen(false)}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button 
                          onClick={saveAnnouncement}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                        >
                          บันทึก
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Security trigger removed - handled elsewhere or via API */}

                {/* Maintenance trigger removed - use card grid above */}

                {/* Maintenance Modal */}
                {isMaintenanceModalOpen && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsMaintenanceModalOpen(false)}
                  >
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg">ตั้งค่าโหมดปิดปรับปรุง</h3>
                        <button 
                          onClick={() => setIsMaintenanceModalOpen(false)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">สถานะโหมดปิดปรับปรุง</h4>
                            <p className="text-sm text-gray-500">เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าใช้งานได้</p>
                          </div>
                          <div 
                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                            className={`w-11 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${maintenanceMode ? 'bg-orange-500' : 'bg-gray-200 dark:bg-neutral-700'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${maintenanceMode ? 'left-5.5' : 'left-0.5'}`}></div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ข้อความแจ้งเตือน</label>
                          <textarea 
                            value={maintenanceMessage ?? ''}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            placeholder="ขออภัยในความไม่สะดวก..."
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">เวลาเปิดระบบอัตโนมัติ (ไม่บังคับ)</label>
                          <input 
                            type="datetime-local" 
                            min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                            value={maintenanceEndTime ?? ''}
                            onChange={(e) => setMaintenanceEndTime(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                          />
                          <p className="text-xs text-gray-500">
                            หากระบุเวลา ระบบจะแสดงเวลานับถอยหลังและเปิดใช้งานอัตโนมัติเมื่อถึงเวลา
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">
                        <button 
                          onClick={() => setIsMaintenanceModalOpen(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button 
                          onClick={saveMaintenanceSettings}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                        >
                          บันทึก
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </>
            )}

            {/* Theme trigger removed - use card grid above */}

            {/* Background Settings */}
            {session?.user?.role === 'ADMIN' && (
              <>
                {/* Background trigger removed - use card grid above */}

                {/* Background Modal */}
                {isBackgroundModalOpen && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsBackgroundModalOpen(false)}
                  >
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg">ตั้งค่าพื้นหลัง</h3>
                        <button 
                          onClick={() => setIsBackgroundModalOpen(false)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">รูปแบบพื้นหลัง</label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              onClick={() => setBackgroundType('grid')}
                              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                backgroundType === 'grid' 
                                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' 
                                  : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                              }`}
                            >
                              <div className="w-full h-16 bg-gray-100 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 relative overflow-hidden">
                                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, #8882 1px, transparent 1px), linear-gradient(to bottom, #8882 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                              </div>
                              <span className="text-sm font-medium">ตาราง (Grid)</span>
                            </button>
                            <button
                              onClick={() => setBackgroundType('image')}
                              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                backgroundType === 'image' 
                                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' 
                                  : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                              }`}
                            >
                              <div className="w-full h-16 bg-gray-100 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 flex items-center justify-center">
                                <ImageIcon size={24} className="text-gray-400" />
                              </div>
                              <span className="text-sm font-medium">รูปภาพ</span>
                            </button>
                          </div>
                        </div>

                        {backgroundType === 'image' && (
                          <div className="space-y-4">
                            <div className="flex justify-center">
                              <div className="w-full h-40 bg-gray-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 dark:border-neutral-700 relative group">
                                {backgroundValue ? (
                                  <img src={backgroundValue} alt="Background Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-center p-4">
                                    <ImageIcon size={40} className="mx-auto text-gray-300 dark:text-neutral-600 mb-2" />
                                    <p className="text-sm text-gray-500">ยังไม่มีรูปภาพ</p>
                                  </div>
                                )}
                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                  <span className="text-white text-sm font-medium flex items-center gap-2">
                                    <Upload size={16} /> อัปโหลดรูปภาพ
                                  </span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleBackgroundUpload}
                                    disabled={uploading}
                                  />
                                </label>
                                {uploading && (
                                  <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">หรือใส่ลิงก์รูปภาพ</label>
                              <input 
                                type="text" 
                                value={backgroundValue ?? ''}
                                onChange={(e) => setBackgroundValue(e.target.value)}
                                placeholder="https://example.com/background.jpg"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                          </div>
                        )}
                        {backgroundType === 'grid' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">สีเส้นตาราง (Grid Line Color)</label>
                                <p className="text-xs text-gray-500">เลือกสีหรือใช้โหมดอัตโนมัติ</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setBackgroundGridAuto(!backgroundGridAuto)}
                                  className={`px-3 py-1 rounded-full border ${backgroundGridAuto ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300'}`}
                                >
                                  {backgroundGridAuto ? 'Auto' : 'Manual'}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <input type="color" value={backgroundGridColor ?? '#888888'} onChange={(e) => setBackgroundGridColor(e.target.value)} className="w-12 h-12 p-0 border rounded-md" disabled={backgroundGridAuto} />
                              <input type="text" value={backgroundGridColor ?? '#888888'} onChange={(e) => setBackgroundGridColor(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none text-sm" disabled={backgroundGridAuto} />
                              <div className="ml-auto w-24 h-12 rounded-md border" style={{ backgroundColor: backgroundGridColor }} />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ความทึบของเส้น (Opacity)</label>
                              <div className="flex items-center gap-3">
                                <input type="range" min="0" max="1" step="0.01" value={backgroundGridAlpha ?? 0.06} onChange={(e) => setBackgroundGridAlpha(parseFloat(e.target.value))} className="w-full" disabled={backgroundGridAuto} />
                                <div className="w-16 text-right text-sm font-medium">{Math.round(backgroundGridAlpha * 100)}%</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ความเบลอของพื้นหลัง</label>
                          <div className="flex items-center gap-4">
                            <input type="range" min="0" max="25" step="1" value={backgroundBlur ?? 0} onChange={(e) => setBackgroundBlur(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700" />
                            <div className="w-16 text-right text-sm font-medium">{backgroundBlur ?? 0}px</div>
                          </div>
                          <p className="text-xs text-gray-500">0 = ไม่มีเบลอ, 25 = เบลอมากที่สุด</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">
                        <button 
                          onClick={() => setIsBackgroundModalOpen(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button 
                          onClick={saveBackgroundSettings}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                        >
                          บันทึก
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </>
            )}

            {/* Notification Settings */}
            {/* Notification trigger removed - use card grid above */}

            {/* Notification Modal */}
            {isNotificationModalOpen && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg">การแจ้งเตือน</h3>
                    <button
                      onClick={() => setIsNotificationModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">แจ้งเตือนการเข้าสู่ระบบ</h4>
                          <p className="text-sm text-gray-500">รับการแจ้งเตือนเมื่อมีผู้ใช้เข้าสู่ระบบ</p>
                        </div>
                        <div 
                          onClick={() => setNotifyOnLogin(!notifyOnLogin)}
                          className={`w-11 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${notifyOnLogin ? 'bg-green-500' : 'bg-gray-200 dark:bg-neutral-700'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${notifyOnLogin ? 'left-5.5' : 'left-0.5'}`}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Webhook URL</label>
                        <input
                          type="text"
                          value={discordWebhookUrl ?? ''}
                          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          ใส่ URL ของ Discord Webhook เพื่อส่งการแจ้งเตือน
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">
                    <button
                      onClick={handleTestNotification}
                      disabled={testingNotification || !discordWebhookUrl}
                      className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-xl font-medium transition-colors mr-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingNotification ? 'กำลังส่ง' : 'ทดสอบ'}
                    </button>
                    <button 
                      onClick={() => setIsNotificationModalOpen(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                    >
                      {'ยกเลิก'}
                    </button>
                    <button 
                      onClick={saveNotificationSettings}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                      {'บันทึก'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Session Timeout Modal */}
            {isSessionTimeoutModalOpen && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsSessionTimeoutModalOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg">ตั้งค่าหมดอายุเซสชัน</h3>
                    <button
                      onClick={() => setIsSessionTimeoutModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">เวลาหมดอายุเซสชัน</label>
                      <select
                        value={sessionTimeoutMinutes}
                        onChange={(e) => setSessionTimeoutMinutes(parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="10">10 นาที</option>
                        <option value="15">15 นาที</option>
                        <option value="20">20 นาที</option>
                        <option value="30">30 นาที</option>
                        <option value="60">1 ชั่วโมง</option>
                        <option value="120">2 ชั่วโมง</option>
                        <option value="240">4 ชั่วโมง</option>
                        <option value="480">8 ชั่วโมง</option>
                        <option value="720">12 ชั่วโมง</option>
                        <option value="1440">24 ชั่วโมง</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        ตั้งเวลาที่ผู้ใช้ทุกคนจะถูกออกจากระบบอัตโนมัติหลังจากเข้าสู่ระบบ
                      </p>
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>เวลาปัจจุบัน:</strong> {sessionTimeoutMinutes >= 60 ? `${Math.floor(sessionTimeoutMinutes / 60)} ชั่วโมง ${sessionTimeoutMinutes % 60 > 0 ? `${sessionTimeoutMinutes % 60} นาที` : ''}`.trim() : `${sessionTimeoutMinutes} นาที`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">
                    <button
                      onClick={() => setIsSessionTimeoutModalOpen(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionTimeoutMinutes })
                          })
                          toast.success('บันทึกการตั้งค่าหมดอายุเซสชันแล้ว')
                          setIsSessionTimeoutModalOpen(false)
                        } catch (error) {
                          toast.error('บันทึกไม่สำเร็จ')
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                      บันทึก
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Weather Effect Modal */}
            {isWeatherModalOpen && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsWeatherModalOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pointer-events-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg">ตั้งค่าเอฟเฟกต์สภาพอากาศ</h3>
                    <button
                      onClick={() => setIsWeatherModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">เอฟเฟกต์สภาพอากาศ</label>
                      <select
                        value={weatherEffect}
                        onChange={(e) => setWeatherEffect(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="none">ไม่มี</option>
                        <option value="snow">หิมะ</option>
                        <option value="rain">ฝน</option>
                        <option value="wind">ลม</option>
                        <option value="sun">แดด</option>
                        <option value="storm">พายุ</option>
                        <option value="stars">ดาวตก</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        เลือกเอฟเฟกต์สภาพอากาศที่จะแสดงในหน้าแรกของผู้ใช้
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ความเร็ว</label>
                      <div className="flex items-center gap-3">
                        <input type="range" min="0.1" max="3" step="0.1" value={weatherSpeed} onChange={(e) => setWeatherSpeed(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700" />
                        <div className="w-12 text-right text-sm font-medium">{weatherSpeed}x</div>
                      </div>
                      <p className="text-xs text-gray-500">ปรับความเร็วของเอฟเฟกต์ (0.1x - 3x)</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">สี</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={weatherColor} onChange={(e) => setWeatherColor(e.target.value)} className="w-12 h-12 p-0 border rounded-md" />
                        <input type="text" value={weatherColor} onChange={(e) => setWeatherColor(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:outline-none text-sm" />
                        <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: weatherColor }} />
                      </div>
                      <p className="text-xs text-gray-500">เลือกสีของเอฟเฟกต์</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ความเข้ม (Intensity)</label>
                      <div className="flex items-center gap-3">
                        <input type="range" min="0.1" max="2" step="0.1" value={weatherIntensity} onChange={(e) => setWeatherIntensity(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700" />
                        <div className="w-12 text-right text-sm font-medium">{weatherIntensity}x</div>
                      </div>
                      <p className="text-xs text-gray-500">ปรับจำนวนอนุภาคของเอฟเฟกต์ (0.1x - 2x)</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">เสียงกระทบ</label>
                        <p className="text-xs text-gray-500">เล่นเสียงเมื่อฝนกระทบสิ่งกีดขวาง</p>
                      </div>
                      <div
                        onClick={() => setWeatherSound(!weatherSound)}
                        className={`w-11 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${weatherSound ? 'bg-green-500' : 'bg-gray-200 dark:bg-neutral-700'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${weatherSound ? 'left-5.5' : 'left-0.5'}`}></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-2">
                    <button
                      onClick={() => setIsWeatherModalOpen(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ weatherEffect, weatherSpeed, weatherColor, weatherIntensity, weatherSound })
                          })
                          toast.success('บันทึกการตั้งค่าเอฟเฟกต์สภาพอากาศแล้ว')
                          setIsWeatherModalOpen(false)
                        } catch (error) {
                          toast.error('บันทึกไม่สำเร็จ')
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                      บันทึก
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Language trigger removed - use card grid above */}

            {/* Language modal removed */}
          </div>

          {/* Seasonal Overrides Modal */}


        </motion.div>
      </div>
    </div>
  )
}
