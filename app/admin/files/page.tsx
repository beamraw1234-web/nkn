'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Plus,
  Search,
  Folder,
  FileText,
  Edit,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  X,
  Menu,
  FileImage,
  FileVideo,
  FileAudio,
  File
} from 'lucide-react'
interface File {
  id: string
  name: string
  size: number
  isHidden: boolean
  password?: string
  mime: string
  priceSatang?: number
  category?: { id: string, name: string }
}

interface Category {
  id: string
  name: string
  count: number
}

export default function AdminFilesPage() {
   const { data: session, status } = useSession()
   const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<File[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [filterCat, setFilterCat] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [renameModal, setRenameModal] = useState(false)
  const [passwordModal, setPasswordModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [categoryModal, setCategoryModal] = useState(false)
  const [editCategoryModal, setEditCategoryModal] = useState(false)
  const [deleteCategoryModal, setDeleteCategoryModal] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [editModal, setEditModal] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPrice, setNewPrice] = useState<string>('0')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadPassword, setUploadPassword] = useState('')
  const [uploadHidden, setUploadHidden] = useState(false)
  const [uploadPrice, setUploadPrice] = useState<string>('0')

  const parsePriceSatang = (value: string) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return 0
    return Math.round(n * 100)
  }

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || data)
      }
    } catch (error) {
      toast.error('โหลดไฟล์ล้มเหลว')
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
      toast.error('โหลดหมวดหมู่ล้มเหลว')
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'ADMIN') {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
      router.push('/')
      return
    }

    Promise.all([fetchFiles(), fetchCategories()]).finally(() => setLoading(false))
  }, [session, status, router])

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file as any)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0 || !uploadCategory) return

    try {
      for (const file of uploadedFiles) {
        const base64 = await fileToBase64(file)
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: (file as any).name,
            base64,
            mime: (file as any).type,
            size: (file as any).size,
            categoryId: uploadCategory || null,
            password: uploadPassword || null,
            isHidden: uploadHidden,
            priceSatang: parsePriceSatang(uploadPrice),
          }),
        })
        if (!res.ok) {
          throw new Error('Upload failed')
        }
      }
      toast.success('อัปโหลดไฟล์สำเร็จ')

      // Optimistically update the file list
      const newFiles = uploadedFiles.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: (file as any).name,
        size: (file as any).size,
        isHidden: uploadHidden,
        password: uploadPassword || undefined,
        mime: (file as any).type,
        priceSatang: parsePriceSatang(uploadPrice),
        category: cats.find(c => c.id === uploadCategory) || undefined
      }))
      setFiles(prev => [...prev, ...newFiles])

      // Update categories count optimistically
      setCats(prev => prev.map(c =>
        c.id === uploadCategory ? { ...c, count: (c.count || 0) + uploadedFiles.length } : c
      ))

      // Refresh data from server after a short delay to ensure consistency
      setTimeout(() => {
        fetchFiles()
        fetchCategories()
      }, 1000)

      setFilterCat(uploadCategory) // Switch to the category where files were uploaded
      setUploadModal(false)
      setUploadedFiles([])
      setUploadCategory('')
      setUploadPassword('')
      setUploadHidden(false)
      setUploadPrice('0')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด')
    }
  }

  const handleRename = async () => {
    if (!selectedFile || !newName) return

    try {
      const res = await fetch(`/api/files/${selectedFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        toast.success('เปลี่ยนชื่อไฟล์สำเร็จ')
        fetchFiles()
        setRenameModal(false)
        setSelectedFile(null)
        setNewName('')
      }
    } catch (error) {
      toast.error('เปลี่ยนชื่อไฟล์ล้มเหลว')
    }
  }

  const handleSetPassword = async () => {
    if (!selectedFile) return

    try {
      const res = await fetch(`/api/files/${selectedFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        toast.success('ตั้งรหัสผ่านสำเร็จ')
        fetchFiles()
        setPasswordModal(false)
        setSelectedFile(null)
        setNewPassword('')
      }
    } catch (error) {
      toast.error('ตั้งรหัสผ่านล้มเหลว')
    }
  }

  const handleEditFile = async () => {
    if (!selectedFile) return

    try {
      const res = await fetch(`/api/files/${selectedFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          password: newPassword,
          isHidden: uploadHidden,
          priceSatang: parsePriceSatang(newPrice)
        }),
      })
      if (res.ok) {
        toast.success('แก้ไขไฟล์สำเร็จ')
        fetchFiles()
        setEditModal(false)
        setSelectedFile(null)
        setNewName('')
        setNewPassword('')
        setNewPrice('0')
        setUploadHidden(false)
      }
    } catch (error) {
      toast.error('แก้ไขไฟล์ล้มเหลว')
    }
  }

  const handleToggleHide = async (id: string, isHidden: boolean) => {
    try {
      const res = await fetch(`/api/files/${id}/hide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: !isHidden }),
      })
      if (res.ok) {
        toast.success(isHidden ? 'ยกเลิกซ่อนไฟล์สำเร็จ' : 'ซ่อนไฟล์สำเร็จ')
        fetchFiles()
      }
    } catch (error) {
      toast.error('เปลี่ยนสถานะการซ่อนล้มเหลว')
    }
  }

  const handleDelete = async () => {
    if (!selectedFile) return

    try {
      const res = await fetch(`/api/files/${selectedFile.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('ลบไฟล์สำเร็จ')
        fetchFiles()
        setDeleteModal(false)
        setSelectedFile(null)
      }
    } catch (error) {
      toast.error('ลบไฟล์ล้มเหลว')
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName) return

    try {
      const res = await fetch('/api/files/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      })
      if (res.ok) {
        toast.success('สร้างหมวดหมู่สำเร็จ')
        fetchCategories()
        setCategoryModal(false)
        setNewCategoryName('')
      }
    } catch (error) {
      toast.error('สร้างหมวดหมู่ล้มเหลว')
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory || !newCategoryName) return

    try {
      const res = await fetch(`/api/files/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      })
      if (res.ok) {
        toast.success('แก้ไขหมวดหมู่สำเร็จ')
        fetchCategories()
        setEditCategoryModal(false)
        setSelectedCategory(null)
        setNewCategoryName('')
      }
    } catch (error) {
      toast.error('แก้ไขหมวดหมู่ล้มเหลว')
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      const res = await fetch(`/api/files/categories/${selectedCategory.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('ลบหมวดหมู่สำเร็จ')
        fetchCategories()
        setDeleteCategoryModal(false)
        setSelectedCategory(null)
      }
    } catch (error) {
      toast.error('ลบหมวดหมู่ล้มเหลว')
    }
  }

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">{'กำลังโหลด...'}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 transition-colors duration-300">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800 p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={20} />
              กลับหน้าหลัก
            </Link>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ค้นหาไฟล์..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>


          <div className="flex gap-3">
            <button
              onClick={() => setUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Upload size={18} />
              อัปโหลด
            </button>
          </div>
        </div>
      </motion.div>

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">จัดการไฟล์</h1>
                <p className="text-gray-500 dark:text-gray-400">Upload / Rename / Hide / Protect</p>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <select
                  value={filterCat || ''}
                  onChange={e => setFilterCat(e.target.value || null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">ทั้งหมด</option>
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.count ?? 0})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex md:hidden justify-center">
              <select
                value={filterCat || ''}
                onChange={e => setFilterCat(e.target.value || null)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full max-w-xs"
              >
                <option value="">ทั้งหมด</option>
                {cats.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.count ?? 0})</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* FILE GRID */}
        <motion.div
          layout
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          <AnimatePresence>
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="col-span-full text-center py-20"
              >
                <FileText size={48} className="mx-auto text-gray-300 dark:text-neutral-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">ไม่มีไฟล์</p>
              </motion.div>
            )}

            {filtered.map((f, index) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {React.createElement(getFileIcon(f.mime), { size: 24 })}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate mb-1">{f.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(f.size / 1024).toFixed(1)} KB · {f.category?.name || 'ไม่มีหมวด'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {f.isHidden && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                      ซ่อน
                    </span>
                  )}
                  {f.password && (
                    <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                      ล็อก
                    </span>
                  )}
                  {(f.priceSatang || 0) > 0 ? (
                    <span className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full">
                      ฿{((f.priceSatang || 0) / 100).toFixed(2)}
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 rounded-full">
                      ฟรี
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedFile(f); setNewName(f.name); setNewPassword(f.password || ''); setUploadHidden(f.isHidden); setNewPrice(String(((f.priceSatang || 0) / 100).toFixed(2))); setEditModal(true) }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Edit size={14} />
                    แก้ไข
                  </button>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
                  <a
                    href={`/api/files/${f.id}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
                  >
                    ดาวน์โหลด
                  </a>
                  <button
                    onClick={() => { setSelectedFile(f); setDeleteModal(true) }}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-4"
            >
              <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Upload size={20} className="text-blue-500" />
                  อัปโหลดไฟล์
                </h3>
                <button onClick={() => setUploadModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }} className="space-y-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ ไฟล์จะถูกอัปโหลดและตั้งค่าตามที่กำหนด หากต้องการเปลี่ยนแปลงภายหลังสามารถแก้ไขได้
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">เลือกไฟล์ (หลายไฟล์ได้)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setUploadedFiles(Array.from(e.target.files || []) as any)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-neutral-800 rounded">
                          {(file as any).type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file as any)}
                              alt={(file as any).name}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <FileText size={20} className="text-gray-500" />
                          )}
                          <span className="text-xs truncate">{(file as any).name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">หมวดหมู่ (ไม่บังคับ)</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>เลือกหมวดหมู่</option>
                    {cats.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">รหัสผ่าน (ไม่บังคับ)</label>
                  <input
                    type="password"
                    value={uploadPassword}
                    onChange={(e) => setUploadPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="ป้อนรหัสผ่าน..."
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="uploadHidden"
                    checked={uploadHidden}
                    onChange={(e) => setUploadHidden(e.target.checked)}
                    className="rounded border-gray-300 dark:border-neutral-700"
                  />
                  <label htmlFor="uploadHidden" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ซ่อนไฟล์
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ราคา (บาท) - ใส่ 0 เพื่อให้ฟรี</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setUploadModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={uploadedFiles.length === 0 || !uploadCategory}
                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                  >
                    อัปโหลด
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-4"
            >
              <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit size={20} className="text-blue-500" />
                    แก้ไขไฟล์
                  </h3>
                  <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleEditFile(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ชื่อไฟล์</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="ป้อนชื่อใหม่..."
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">รหัสผ่าน (เว้นว่างเพื่อลบ)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      placeholder="ป้อนรหัสผ่าน..."
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editHidden"
                      checked={uploadHidden}
                      onChange={(e) => setUploadHidden(e.target.checked)}
                      className="rounded border-gray-300 dark:border-neutral-700"
                    />
                    <label htmlFor="editHidden" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ซ่อนไฟล์
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ราคา (บาท) - ใส่ 0 เพื่อให้ฟรี</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex gap-3 justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => setEditModal(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                    >
                      บันทึก
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {renameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit size={20} className="text-blue-500" />
                  เปลี่ยนชื่อไฟล์
                </h3>
                <button onClick={() => setRenameModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ชื่อใหม่</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="ป้อนชื่อใหม่..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setRenameModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRename}
                  className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                >
                  บันทึก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {passwordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock size={20} className="text-green-500" />
                  ตั้งรหัสผ่านไฟล์
                </h3>
                <button onClick={() => setPasswordModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">รหัสผ่าน (เว้นว่างเพื่อลบ)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    placeholder="ป้อนรหัสผ่าน..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setPasswordModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSetPassword}
                  className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors shadow-lg shadow-green-600/20"
                >
                  ตั้งค่า
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ยืนยันการลบ</h3>
                <p className="text-gray-500 dark:text-gray-400">คุณต้องการลบไฟล์ &ldquo;{selectedFile?.name}&rdquo; ใช่หรือไม่?</p>
              </div>
              <div className="flex gap-3 justify-center w-full">
                <button
                  onClick={() => setDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors shadow-lg shadow-red-500/20"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Category Modal */}
      <AnimatePresence>
        {categoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus size={20} className="text-green-500" />
                  เพิ่มหมวดหมู่ใหม่
                </h3>
                <button onClick={() => setCategoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    placeholder="ป้อนชื่อหมวดหมู่..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors shadow-lg shadow-green-600/20"
                >
                  สร้าง
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Category Modal */}
      <AnimatePresence>
        {editCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit size={20} className="text-yellow-500" />
                  แก้ไขหมวดหมู่
                </h3>
                <button onClick={() => setEditCategoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                    placeholder="ป้อนชื่อหมวดหมู่..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setEditCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleEditCategory}
                  className="px-6 py-2 bg-yellow-600 text-white hover:bg-yellow-700 rounded-lg transition-colors shadow-lg shadow-yellow-600/20"
                >
                  บันทึก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Category Modal */}
      <AnimatePresence>
        {deleteCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ยืนยันการลบหมวดหมู่</h3>
                <p className="text-gray-500 dark:text-gray-400">คุณต้องการลบหมวดหมู่ &ldquo;{selectedCategory?.name}&rdquo; ใช่หรือไม่?</p>
              </div>
              <div className="flex gap-3 justify-center w-full">
                <button
                  onClick={() => setDeleteCategoryModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors shadow-lg shadow-red-500/20"
                >
                  ลบ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
