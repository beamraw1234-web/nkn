'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, Variants } from 'framer-motion'
import { LogOut, User, Settings, Shield, FileText, Activity, Home, Folder, Lock, Plus } from 'lucide-react'
import Link from 'next/link'
export default function AdminDashboard({ session, logoUrl }: { session: any, logoUrl?: string }) {
  const router = useRouter()

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
    <div className="min-h-screen text-neutral-900 dark:text-neutral-100 selection:bg-blue-500/30">
      {/* Navbar / Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/30 dark:bg-neutral-900/30 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                 <img src={logoUrl} alt="Admin Logo" className="h-12 w-auto object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <span className="font-bold text-xl tracking-tight">AdminSystem</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium">{session?.user?.name}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{session?.user?.role}</span>
              </div>
              <button
                onClick={async () => { await signOut({ redirect: false }); router.push('/login'); }}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-red-500"
                title={'ออกจากระบบ'}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-4xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl p-8 md:p-10 border border-white/20 dark:border-neutral-800 shadow-xl">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-4"
                >
                  <Shield size={14} />
                  System Admin
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-5xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight"
                >
                  Admin <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">Dashboard</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-500 dark:text-gray-400 text-lg max-w-xl leading-relaxed"
                >
                  {'จัดการระบบทั้งหมด'}
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="hidden md:flex w-24 h-24 bg-linear-to-br from-purple-500 to-indigo-600 rounded-2xl items-center justify-center text-white shadow-lg shadow-purple-500/30 rotate-3 hover:rotate-6 transition-transform duration-300"
              >
                <Settings size={40} />
              </motion.div>
            </div>
          </motion.div>

          {/* Grid Content */}
          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Dashboard Index */}
            <motion.div variants={itemVariants}>
              <Link href="/?view=user" aria-label="ไปที่หน้าแรกของผู้ใช้" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-teal-500/50 transition-all hover:shadow-lg hover:shadow-teal-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Home size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform">
                    <Home size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">หน้าแรกผู้ใช้</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">เข้าสู่แดชบอร์ดของผู้ใช้</p>
                </div>
              </Link>
            </motion.div>
            {/* Profile Card */}
            <motion.div variants={itemVariants}>
              <Link href="/profile" aria-label={'ข้อมูลส่วนตัว'} className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <User size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <User size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{'ข้อมูลส่วนตัว'}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    ดูและแก้ไขข้อมูลโปรไฟล์ของคุณ
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Settings */}
            <motion.div variants={itemVariants}>
              <Link href="/settings" aria-label="การตั้งค่า" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-neutral-500/50 transition-all hover:shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Settings size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 mb-4 group-hover:scale-110 transition-transform">
                    <Settings size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">การตั้งค่า</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {'ตั้งค่าระบบ'}
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Admin Tools */}
            <motion.div variants={itemVariants}>
              <Link href="/admin/users" aria-label={'เครื่องมือผู้ดูแลระบบ'} className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                    <Shield size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{'จัดการผู้ใช้'}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
ระบบจัดการสมาชิก (Admin)
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Files Management Card */}
            <motion.div variants={itemVariants}>
              <Link href="/admin/files" aria-label="จัดการไฟล์" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FileText size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">จัดการไฟล์</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">อัปโหลด ดู และจัดการไฟล์ที่แชร์</p>
                  <div className="mt-4">

                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Pages Management Card */}
            <motion.div variants={itemVariants}>
              <Link href="/admin/pages" aria-label="จัดการหน้า" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Plus size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">จัดการหน้า</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">สร้างและจัดการหน้าเว็บแบบไดนามิก</p>
                  <div className="mt-4">

                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Categories Management Card */}
            <motion.div variants={itemVariants}>
              <Link href="/admin/categories" aria-label="จัดการหมวดหมู่" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Folder size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                    <Folder size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">จัดการหมวดหมู่</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">สร้าง แก้ไข และจัดการหมวดหมู่ไฟล์</p>
                  <div className="mt-4">

                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Access Management Card */}
            <motion.div variants={itemVariants}>
              <Link href="/admin/access" aria-label="จัดการการเข้าถึง" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Lock size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">จัดการการเข้าถึง</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">กำหนดสิทธิ์การเข้าถึงหน้าเว็บ</p>
                  <div className="mt-4">

                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link href="/admin/logs/user" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{'User Logs'}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
ประวัติการใช้งาน
                  </p>
                </div>
              </Link>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Link href="/admin/logs/admin" className="block h-full group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 border border-white/20 dark:border-neutral-800 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FileText size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{'Admin Logs'}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
ประวัติการใช้งานของผู้ดูแลระบบ
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
