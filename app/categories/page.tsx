'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { BackgroundManager } from '@/components/BackgroundManager'
import {
  ArrowLeft,
  Folder,
  FileText,
  Search,
  FolderOpen,
  Grid3x3,
  List,
  ChevronRight,
  Zap
} from 'lucide-react'

interface Category {
  id: string
  name: string
  count: number
}

export default function CategoriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/files/categories?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to load categories')
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchCategories().finally(() => setLoading(false))
  }, [session, status, router])

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen transition-colors duration-300 relative">
      <BackgroundManager />
      
      <div className="relative z-10">
        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-neutral-900/70 border-b border-gray-200/50 dark:border-neutral-800/50 px-6 py-4 shadow-sm"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="w-32 h-5 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header Section Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-xl animate-pulse w-2/3"></div>
              <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse w-1/2"></div>
            </div>

            {/* Search Bar Skeleton */}
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-2xl animate-pulse"></div>

            {/* Stats Skeleton */}
            <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse w-1/4"></div>
          </motion.div>

          {/* Category Grid Skeleton */}
          <motion.div
            layout
            className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="group relative h-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-neutral-800/50 p-6 shadow-sm">
                  <div className="relative space-y-4">
                    {/* Icon Skeleton */}
                    <div className="w-14 h-14 bg-linear-to-br from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl animate-pulse"></div>

                    {/* Content Skeleton */}
                    <div className="space-y-3">
                      <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse w-1/2"></div>
                    </div>

                    {/* Action Skeleton */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse w-1/4"></div>
                      <div className="w-5 h-5 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen transition-colors duration-300 relative">
      <BackgroundManager />

      <div className="relative z-10">
        {/* Header Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-neutral-900/70 border-b border-gray-200/50 dark:border-neutral-800/50 px-6 py-4 shadow-sm"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group">
              <motion.div
                whileHover={{ x: -4 }}
                className="group-hover:bg-gray-100 dark:group-hover:bg-neutral-800 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </motion.div>
              <span className="font-medium">กลับหน้าหลัก</span>
            </Link>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
              >
                <Grid3x3 size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
              >
                <List size={20} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <FolderOpen size={40} className="text-blue-600 dark:text-blue-400" />
                หมวดหมู่
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">เลือกหมวดหมู่เพื่อดูไฟล์</p>
            </div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative group max-w-md mx-auto"
            >
              <div className="absolute inset-0 bg-linear-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-gray-200/50 dark:border-neutral-800/50 rounded-2xl px-4 py-3 shadow-sm group-focus-within:shadow-xl group-focus-within:border-blue-400/50 transition-all duration-300">
                <Search size={20} className="text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="ค้นหาหมวดหมู่..."
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-lg"
                />
                {query && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setQuery('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    ✕
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Stats */}
            {categories.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <Zap size={16} className="text-amber-500" />
                พบ <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> หมวดหมู่
              </motion.div>
            )}
          </motion.div>

          {/* Categories Grid/List */}
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="bg-linear-to-br from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-12 text-center border border-gray-200/50 dark:border-neutral-700/50">
                  <Folder size={64} className="mx-auto text-gray-300 dark:text-neutral-700 mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">ไม่พบหมวดหมู่</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {query ? 'ลองค้นหาคำอื่น ๆ' : 'ยังไม่มีหมวดหมู่ในระบบ'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                layout
                className={`grid gap-5 transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                <AnimatePresence>
                  {filtered.map((cat, index) => (
                    <motion.div
                      key={cat.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/files?category=${cat.id}`}>
                        {viewMode === 'grid' ? (
                          // Grid View Card
                          <motion.div
                            whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full bg-linear-to-br from-white to-gray-50/50 dark:from-neutral-900 dark:to-neutral-900/50 rounded-2xl border border-gray-200/50 dark:border-neutral-800/50 p-6 shadow-sm hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all duration-300 overflow-hidden cursor-pointer"
                          >
                            {/* Gradient overlay on hover */}
                            <div className="absolute inset-0 bg-linear-to-br from-blue-600/0 to-indigo-600/0 group-hover:from-blue-600/5 group-hover:to-indigo-600/5 dark:group-hover:from-blue-600/10 dark:group-hover:to-indigo-600/10 transition-all duration-300 rounded-2xl"></div>

                            <div className="relative space-y-4">
                              {/* Icon */}
                              <div className="inline-flex">
                                <motion.div
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-14 h-14 rounded-xl bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:shadow-lg transition-all duration-300"
                                >
                                  <Folder size={28} />
                                </motion.div>
                              </div>

                              {/* Content */}
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                  {cat.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                                  <FileText size={14} />
                                  {cat.count ?? 0} ไฟล์
                                </p>
                              </div>

                              {/* Action */}
                              <div className="pt-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">คลิกเพื่อเลือก</span>
                                <motion.div
                                  whileHover={{ x: 4 }}
                                  className="text-blue-600 dark:text-blue-400"
                                >
                                  <ChevronRight size={18} />
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          // List View Card
                          <motion.div
                            whileHover={{ x: 8, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative flex items-center gap-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-neutral-800/50 p-6 shadow-sm hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all duration-300 overflow-hidden cursor-pointer"
                          >
                            {/* Background gradient */}
                            <div className="absolute inset-0 bg-linear-to-r from-blue-600/0 to-indigo-600/0 group-hover:from-blue-600/5 group-hover:to-indigo-600/5 dark:group-hover:from-blue-600/10 dark:group-hover:to-indigo-600/10 transition-all duration-300 rounded-2xl"></div>

                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="relative w-12 h-12 rounded-xl bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"
                            >
                              <Folder size={24} />
                            </motion.div>

                            <div className="relative flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                {cat.name}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                <FileText size={14} />
                                {cat.count ?? 0} ไฟล์
                              </p>
                            </div>

                            <motion.div
                              whileHover={{ x: 4 }}
                              className="relative text-blue-600 dark:text-blue-400 shrink-0"
                            >
                              <ChevronRight size={20} />
                            </motion.div>
                          </motion.div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}