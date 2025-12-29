'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { BackgroundManager } from '@/components/BackgroundManager'
import {
  ArrowLeft,
  Search,
  Folder,
  FileText,
  Download,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Grid3X3,
  List,
  ArrowUpDown,
  Filter,
  ChevronDown
} from 'lucide-react'

interface File {
  id: string
  name: string
  size: number
  isHidden: boolean
  password?: string
  mime: string
  category?: { id: string, name: string }
  createdAt?: string
}

interface Category {
  id: string
  name: string
  count: number
}

function FilesContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [files, setFiles] = useState<File[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [filterCat, setFilterCat] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'createdAt'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('')

  const categoryId = searchParams.get('category')

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || data)
      }
    } catch (error) {
      console.error('Failed to load files')
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/files/categories?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        setCats(data)
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

    Promise.all([fetchFiles(), fetchCategories()]).finally(() => setLoading(false))
  }, [session, status, router])

  useEffect(() => {
    setFilterCat(categoryId)
    if (cats.length > 0) {
      const cat = cats.find(c => c.id === categoryId)
      setSelectedCategoryName(cat?.name || '')
    }
  }, [categoryId, cats])

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return FileImage
    if (mime.startsWith('video/')) return FileVideo
    if (mime.startsWith('audio/')) return FileAudio
    return File
  }

  const filtered = files.filter(f => {
    const matchesCat = filterCat === null || String(f.category?.id) === filterCat
    const matchesQuery = f.name.toLowerCase().includes(query.toLowerCase())
    return matchesCat && matchesQuery
  })

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'size':
        aVal = a.size
        bVal = b.size
        break
      case 'createdAt':
        aVal = new Date(a.createdAt || 0).getTime()
        bVal = new Date(b.createdAt || 0).getTime()
        break
      default:
        return 0
    }
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
    }
  })

  if (loading) return (
    <div className="min-h-screen transition-colors duration-300 relative">
      <BackgroundManager />
      {/* Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800 px-6 py-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={20} />
            กลับหน้าหลัก
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ไฟล์</h1>
          <div className="w-20"></div>
        </div>
      </motion.div>

      {/* Controls Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-50/80 dark:bg-neutral-950/80 border-b border-gray-200 dark:border-neutral-800 px-6 py-4"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ค้นหาไฟล์..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select disabled className="px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
              <option>ทั้งหมด</option>
            </select>

            <select disabled className="px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
              <option>ชื่อ A-Z</option>
            </select>

            <div className="flex border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden">
              <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
                <Grid3X3 size={16} />
              </button>
              <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          ))}
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
            <Link href="/categories" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group">
              <motion.div
                whileHover={{ x: -4 }}
                className="group-hover:bg-gray-100 dark:group-hover:bg-neutral-800 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </motion.div>
              <span className="font-medium">เลือกหมวดหมู่</span>
            </Link>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
              >
                <Grid3X3 size={20} />
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
                <FileText size={40} className="text-blue-600 dark:text-blue-400" />
                {selectedCategoryName ? `ไฟล์ใน - ${selectedCategoryName}` : 'ไฟล์'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">เลือกไฟล์ที่ต้องการดาวน์โหลด</p>
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
                  placeholder="ค้นหาไฟล์..."
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

            {/* Stats and Sort */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {sorted.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <FileText size={16} className="text-amber-500" />
                  พบ <span className="font-semibold text-gray-900 dark:text-white">{sorted.length}</span> ไฟล์
                </motion.div>
              )}

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [by, order] = e.target.value.split('-')
                  setSortBy(by as 'name' | 'size' | 'createdAt')
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="px-4 py-2 rounded-xl border border-gray-200/50 dark:border-neutral-800/50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              >
                <option value="name-asc">ชื่อ A-Z</option>
                <option value="name-desc">ชื่อ Z-A</option>
                <option value="size-asc">ขนาด น้อย-มาก</option>
                <option value="size-desc">ขนาด มาก-น้อย</option>
                <option value="createdAt-asc">วันที่ เก่า-ใหม่</option>
                <option value="createdAt-desc">วันที่ ใหม่-เก่า</option>
              </select>
            </div>
          </motion.div>

          {/* Files Grid/List */}
          <AnimatePresence mode="wait">
            {sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="bg-linear-to-br from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-12 text-center border border-gray-200/50 dark:border-neutral-700/50">
                  <FileText size={64} className="mx-auto text-gray-300 dark:text-neutral-700 mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">ไม่มีไฟล์</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {query ? 'ลองค้นหาคำอื่น ๆ' : 'ยังไม่มีไฟล์ในหมวดหมู่นี้'}
                  </p>
                  <button
                    onClick={() => { fetchFiles(); fetchCategories(); }}
                    className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    โหลดใหม่
                  </button>
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
                  {sorted.map((f, index) => (
                    <motion.div
                      key={f.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
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
                            {/* Icon/Image */}
                            <div className="inline-flex">
                              {f.mime.startsWith('image/') ? (
                                <img
                                  src={`/api/files/${f.id}`}
                                  className="w-14 h-14 object-cover rounded-xl group-hover:scale-110 transition-transform"
                                  alt={f.name}
                                  loading="lazy"
                                />
                              ) : (
                                <motion.div
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-14 h-14 rounded-xl bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:shadow-lg transition-all duration-300"
                                >
                                  {React.createElement(getFileIcon(f.mime), { size: 28 })}
                                </motion.div>
                              )}
                            </div>

                            {/* Content */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                {f.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                                <FileText size={14} />
                                {(f.size / 1024).toFixed(1)} KB
                              </p>
                              {f.createdAt && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {new Date(f.createdAt).toLocaleDateString('th-TH')}
                                </p>
                              )}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              {f.password && (
                                <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                  ล็อก
                                </span>
                              )}
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                                {f.mime.split('/')[0]}
                              </span>
                            </div>

                            {/* Action */}
                            <div className="pt-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">คลิกเพื่อดาวน์โหลด</span>
                              <a
                                href={`/api/files/${f.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              >
                                <motion.div
                                  whileHover={{ x: 4 }}
                                >
                                  <Download size={18} />
                                </motion.div>
                              </a>
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

                          {f.mime.startsWith('image/') ? (
                            <img
                              src={`/api/files/${f.id}`}
                              className="relative w-12 h-12 object-cover rounded-xl shrink-0"
                              alt={f.name}
                              loading="lazy"
                            />
                          ) : (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="relative w-12 h-12 rounded-xl bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"
                            >
                              {React.createElement(getFileIcon(f.mime), { size: 24 })}
                            </motion.div>
                          )}

                          <div className="relative flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {f.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                              <FileText size={14} />
                              {(f.size / 1024).toFixed(1)} KB · {f.category?.name || 'ไม่มีหมวด'}
                            </p>
                            {f.createdAt && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                อัปโหลดเมื่อ {new Date(f.createdAt).toLocaleDateString('th-TH')}
                              </p>
                            )}
                          </div>

                          <div className="relative flex flex-wrap gap-2 mr-4">
                            {f.password && (
                              <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                ล็อก
                              </span>
                            )}
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                              {f.mime.split('/')[0]}
                            </span>
                          </div>

                          <a
                            href={`/api/files/${f.id}`}
                            className="relative text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shrink-0"
                          >
                            <motion.div
                              whileHover={{ x: 4 }}
                            >
                              <Download size={20} />
                            </motion.div>
                          </a>
                        </motion.div>
                      )}
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

import { Suspense } from 'react'

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <FilesContent />
    </Suspense>
  )
}