'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Trash2, Edit, Folder, ArrowLeft, X, Plus, Eye, EyeOff } from 'lucide-react'
interface Category {
  id: string
  name: string
  count: number
  createdAt: string
  visible: boolean
}

export default function AdminCategoriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editVisible, setEditVisible] = useState(true)
  const [addVisible, setAddVisible] = useState(true)
  const [users, setUsers] = useState([])
  const [locks, setLocks] = useState([])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/files/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
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

    Promise.all([fetchCategories(), fetchUsers()]).finally(() => setLoading(false))
  }, [session, status, router])

  const handleDelete = (id: string) => {
    setCategoryToDelete(id)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      const res = await fetch(`/api/files/categories/${categoryToDelete}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('ลบหมวดหมู่สำเร็จ')
        fetchCategories()
      }
    } catch (error) {
      toast.error('ลบหมวดหมู่ล้มเหลว')
    } finally {
      setDeleteModalOpen(false)
      setCategoryToDelete(null)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setEditVisible(category.visible)
    fetchLocks(category.id)
    setEditModalOpen(true)
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !newCategoryName) return

    try {
      const res = await fetch(`/api/files/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, visible: editVisible }),
      })

      if (res.ok) {
        toast.success('แก้ไขหมวดหมู่สำเร็จ')
        fetchCategories()
        setEditModalOpen(false)
        setEditingCategory(null)
        setNewCategoryName('')
      } else {
        toast.error('แก้ไขหมวดหมู่ล้มเหลว')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแก้ไข')
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName) return

    try {
      const res = await fetch('/api/files/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, visible: addVisible }),
      })

      if (res.ok) {
        toast.success('เพิ่มหมวดหมู่สำเร็จ')
        fetchCategories()
        setAddModalOpen(false)
        setNewCategoryName('')
      } else {
        toast.error('เพิ่มหมวดหมู่ล้มเหลว')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่ม')
    }
  }

  const handleToggleVisible = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/files/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !current }),
      })

      if (res.ok) {
        toast.success('อัปเดตสถานะสำเร็จ')
        fetchCategories()
      } else {
        toast.error('อัปเดตสถานะล้มเหลว')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to load users')
    }
  }

  const fetchLocks = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}/locks`)
      if (res.ok) {
        const data = await res.json()
        setLocks(data.locks)
      }
    } catch (error) {
      console.error('Failed to load locks')
    }
  }

  if (loading) return <div className="p-8 text-center dark:text-white">{'กำลังโหลด...'}</div>

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-300 font-sans">
      <div className="max-w-7xl mx-auto">
        <Link href="/" className="inline-flex items-center px-4 py-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-white dark:hover:bg-neutral-800 transition-all mb-8 group border border-gray-200 dark:border-neutral-800">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          กลับหน้าหลัก
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 dark:border-neutral-800 overflow-hidden"
        >
          <div className="p-6 md:p-8 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">จัดการหมวดหมู่</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <Folder size={16} className="text-purple-500" />
                  จัดการหมวดหมู่ไฟล์
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium">
                  หมวดหมู่ทั้งหมด: {categories.length}
                </div>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
                >
                  <Plus size={18} />
                  เพิ่มหมวดหมู่
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-neutral-800/50 border-b border-gray-100 dark:border-neutral-800">
                  <th className="p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">ชื่อหมวดหมู่</th>
                  <th className="p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">จำนวนไฟล์</th>
                  <th className="p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">วันที่สร้าง</th>
                  <th className="p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">แสดง</th>
                  <th className="p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider text-right">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50/80 dark:hover:bg-neutral-800/50 transition-colors group">
                    <td className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <Folder size={20} />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-base">{category.name}</span>
                      </div>
                    </td>
                    <td className="p-4 md:p-6">
                      <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                        {category.count ?? 0} ไฟล์
                      </span>
                    </td>
                    <td className="p-4 md:p-6 text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(category.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 md:p-6">
                      <button
                        onClick={() => handleToggleVisible(category.id, category.visible)}
                        className={`p-2 rounded-lg transition-all ${
                          category.visible
                            ? 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
                            : 'text-gray-400 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700'
                        }`}
                        title={category.visible ? 'ซ่อนหมวดหมู่' : 'แสดงหมวดหมู่'}
                      >
                        {category.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </td>
                    <td className="p-4 md:p-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-all shadow-sm hover:shadow"
                          title="แก้ไข"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-all shadow-sm hover:shadow"
                          title="ลบ"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Add Category Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-purple-500" />
                เพิ่มหมวดหมู่ใหม่
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  required
                  placeholder="ป้อนชื่อหมวดหมู่..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="add-visible"
                  checked={addVisible}
                  onChange={(e) => setAddVisible(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="add-visible" className="text-sm font-medium text-gray-700 dark:text-gray-300">แสดงหมวดหมู่</label>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors shadow-lg shadow-purple-600/20"
                >
                  เพิ่ม
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit size={20} className="text-blue-500" />
                แก้ไขหมวดหมู่
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-visible"
                  checked={editVisible}
                  onChange={(e) => setEditVisible(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="edit-visible" className="text-sm font-medium text-gray-700 dark:text-gray-300">แสดงหมวดหมู่</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ล็อกผู้ใช้</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-neutral-700 rounded-lg p-2 space-y-2">
                  {users.filter((u: any) => u.role !== 'ADMIN').map((user: any) => (
                    <div key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`edit-lock-${user.id}`}
                        checked={locks.some((l: any) => l.userId === user.id)}
                        onChange={async (e) => {
                          const locked = e.target.checked
                          await fetch(`/api/categories/${editingCategory?.id}/locks`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, locked })
                          })
                          fetchLocks(editingCategory?.id || '')
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`edit-lock-${user.id}`} className="text-sm">{user.username} {user.nickname && `(${user.nickname})`}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-neutral-800"
          >
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ยืนยันการลบ</h3>
              <p className="text-gray-500 dark:text-gray-400">คุณต้องการลบหมวดหมู่นี้ใช่หรือไม่?</p>
            </div>
            <div className="flex gap-3 justify-center w-full">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors shadow-lg shadow-red-500/20"
              >
                ลบ
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}