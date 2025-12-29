"use client"

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, User, ChevronRight, Megaphone, Snowflake, Star, Zap, Heart, AlertTriangle, File, FileText, Gift } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function UserDashboard({ session, logoUrl }: { session: any, logoUrl?: string }) {
  const [announcement, setAnnouncement] = useState('')
  const [announcementIcon, setAnnouncementIcon] = useState('Megaphone')
  const [announcementColor, setAnnouncementColor] = useState('#06b6d4')
  const [announcementSpeed, setAnnouncementSpeed] = useState(20)
  const [windowWidth, setWindowWidth] = useState(1920)
  const [windowHeight, setWindowHeight] = useState(1080)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      setWindowHeight(window.innerHeight)
    }
  }, [])

  useEffect(() => {
    fetch('/api/announcement')
      .then(res => res.json())
      .then(data => {
        setAnnouncement(data.content);
        setAnnouncementIcon(data.icon);
        setAnnouncementColor(data.color);
        setAnnouncementSpeed(data.speed);
      })
      .catch(err => console.error('Failed to fetch announcement:', err));
  }, [])

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Snowflake': return <Snowflake size={20} className="text-white" />
      case 'Star': return <Star size={20} className="text-white" />
      case 'Zap': return <Zap size={20} className="text-white" />
      case 'Heart': return <Heart size={20} className="text-white" />
      case 'AlertTriangle': return <AlertTriangle size={20} className="text-white" />
      default: return <Megaphone size={20} className="text-white" />
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-emerald-950 via-black to-red-950 text-white selection:bg-red-500/40">
      
      {/* Christmas Garland Lights - สายไฟคริสต์มาสด้านบน */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-20">
        <svg viewBox="0 0 1440 200" className="w-full h-full">
          <path d="M0,100 Q360,20 720,100 T1440,100" fill="none" stroke="rgba(34,197,94,0.3)" strokeWidth="8"/>
          {[...Array(20)].map((_, i) => (
            <g key={i} transform={`translate(${i * 72}, ${80 + Math.sin(i * 0.5) * 30})`}>
              <circle cx="0" cy="0" r="12" fill={i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#22c55e' : '#fbbf24'} className="drop-shadow-lg">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="20" r="8" fill="#1f2937" />
            </g>
          ))}
        </svg>
      </div>

      {/* Floating Ornaments & Gifts - ลูกบอล + ของขวัญลอย */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`ornament-${i}`}
          className="absolute pointer-events-none"
          initial={{ y: -100, x: Math.random() * windowWidth }}
          animate={{
            y: windowHeight + 100,
            x: Math.random() * windowWidth,
            rotate: [0, 360],
          }}
          transition={{
            duration: 15 + Math.random() * 20,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10,
          }}
          style={{ left: 0 }}
        >
          {i % 3 === 0 ? (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-xl border-4 border-yellow-300">
              <div className="w-3 h-6 bg-yellow-400 rounded-t-full absolute -top-4 left-1/2 -translate-x-1/2" />
            </div>
          ) : i % 3 === 1 ? (
            <Gift size={48} className="text-green-400 drop-shadow-xl" strokeWidth={1.5} />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 shadow-xl border-4 border-white">
              <div className="w-3 h-6 bg-white rounded-t-full absolute -top-4 left-1/2 -translate-x-1/2" />
            </div>
          )}
        </motion.div>
      ))}

      {/* Snow Effect Overlay - หิมะตกเบา ๆ */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div className="absolute inset-0">
          {[...Array(80)].map((_, i) => (
            <motion.div
              key={`snow-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full opacity-80"
              initial={{ y: -10, x: Math.random() * windowWidth }}
              animate={{
                y: windowHeight + 10,
                x: [null, Math.random() * windowWidth],
              }}
              transition={{
                duration: 8 + Math.random() * 12,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10,
              }}
            />
          ))}
        </div>
      </div>

      {/* Navbar */}
      <nav className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center relative z-30">
        <div className="flex items-center gap-3">
           {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain drop-shadow-2xl" />
           ) : (
             <>
               <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl">
                 S
               </div>
               <span className="font-bold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-green-400">
                 nkn
               </span>
             </>
           )}
         </div>
        <button 
          onClick={async () => { await signOut({ redirect: false }); router.push('/login'); }}
          className="p-3 hover:bg-red-600/30 rounded-full transition-all text-red-300 hover:text-red-100"
          title={'ออกจากระบบ'}
        >
          <LogOut size={24} />
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 relative z-20">
        
        {/* Hero Section - ข้อความต้อนรับแบบคริสต์มาส */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-20"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            {'สวัสดี'} {' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-green-400 to-yellow-400 drop-shadow-2xl">
              {session?.user?.name || 'เพื่อนรัก'} 🎄
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300">
            ขอให้มีความสุขมากๆ ในเทศกาลแห่งความรักและการให้ ✨
          </p>
        </motion.div>

        {/* Announcement - ปรับเป็นสีคริสต์มาส */}
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 max-w-4xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 bg-gradient-to-r from-red-500 to-green-500" />
              <div className="relative rounded-full bg-black/60 backdrop-blur-xl border-2 border-red-500/50 shadow-2xl flex items-center p-4 gap-4 overflow-hidden">
                <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-green-500 flex items-center justify-center shadow-lg">
                  {getIcon(announcementIcon)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <motion.div 
                    animate={{ x: ["100%", "-100%"] }} 
                    transition={{ repeat: Infinity, duration: announcementSpeed, ease: "linear" }}
                    className="whitespace-nowrap text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-red-300"
                  >
                    🎅 {announcement} 🎁
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Feature Grid - Card แบบคริสต์มาส */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <Link href="/profile" className="group">
            <motion.div className="h-full p-10 bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-md border-2 border-red-500/30 rounded-3xl hover:border-yellow-400/60 hover:shadow-2xl hover:shadow-red-500/30 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <User size={32} className="text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-red-300">
                  ข้อมูลส่วนตัว
                </h3>
                <p className="text-gray-300 mb-8">ดูและแก้ไขข้อมูลโปรไฟล์ของคุณ</p>
                <div className="flex items-center text-yellow-300 font-bold text-lg">
                  จัดการข้อมูล <ChevronRight size={24} className="ml-2 group-hover:translate-x-3 transition-transform" />
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/categories" className="group">
            <motion.div className="h-full p-10 bg-gradient-to-br from-green-900/40 to-black/60 backdrop-blur-md border-2 border-green-500/30 rounded-3xl hover:border-yellow-400/60 hover:shadow-2xl hover:shadow-green-500/30 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <File size={32} className="text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-300">
                  ไฟล์
                </h3>
                <p className="text-gray-300 mb-8">เลือกหมวดหมู่เพื่อดูไฟล์</p>
                <div className="flex items-center text-yellow-300 font-bold text-lg">
                  เลือกหมวดหมู่ <ChevronRight size={24} className="ml-2 group-hover:translate-x-3 transition-transform" />
                </div>
              </div>
            </motion.div>
          </Link>

          

        </div>

        {/* Footer */}
        <motion.div className="mt-24 pt-12 border-t border-white/10 text-center text-gray-400">
          <p className="text-lg">© 2025 ServiceHub Inc. 🎅 Made with ❤️ and ☕ for Christmas</p>
        </motion.div>
      </main>
    </div>
  )
}