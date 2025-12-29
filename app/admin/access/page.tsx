'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Unlock, Users, Settings, Eye, EyeOff, FileText, X, Search } from 'lucide-react'
interface PageAccess {
  id: string
  page: string
  allowedUsers: string[]
  isMaintenance: boolean
  maintenanceMessage?: string
}

export default function AccessManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pages, setPages] = useState<PageAccess[]>([])
  const [users, setUsers] = useState<{id: string, username: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState<PageAccess | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'maintenance' | 'active'>('all')

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/access')
      if (res.ok) {
        const data = await res.json()
        setPages(data)
      }
    } catch (error) {
      toast.error('โหลดข้อมูลการเข้าถึงล้มเหลว')
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
      toast.error('โหลดข้อมูลผู้ใช้ล้มเหลว')
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'ADMIN') {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
      router.push('/')
      return
    }

    Promise.all([fetchPages(), fetchUsers()]).finally(() => setLoading(false))
  }, [session, status, router])

  // Filter pages based on search and status
  const filteredPages = pages.filter(page => {
    const matchesSearch = page.page.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'maintenance' && page.isMaintenance) ||
      (filterStatus === 'active' && !page.isMaintenance)
    return matchesSearch && matchesStatus
  })

  // Statistics
  const stats = {
    total: pages.length,
    maintenance: pages.filter(p => p.isMaintenance).length,
    active: pages.filter(p => !p.isMaintenance).length,
    totalUsers: users.length
  }

  const updatePageAccess = async (pageId: string, allowedUsers: string[], isMaintenance: boolean, maintenanceMessage?: string) => {
    setSaving(true)
    // Optimistic update
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, allowedUsers, isMaintenance, maintenanceMessage } : p
    ))

    try {
      const res = await fetch(`/api/access/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedUsers, isMaintenance, maintenanceMessage }),
      })
      if (res.ok) {
        toast.success('อัปเดตการเข้าถึงสำเร็จ')
        fetchPages() // Refresh to ensure consistency
      } else {
        // Revert on error
        setPages(prev => prev.map(p =>
          p.id === pageId ? { ...p, allowedUsers: p.allowedUsers, isMaintenance: p.isMaintenance, maintenanceMessage: p.maintenanceMessage } : p
        ))
        toast.error('อัปเดตการเข้าถึงล้มเหลว')
      }
    } catch (error) {
      // Revert on error
      setPages(prev => prev.map(p =>
        p.id === pageId ? { ...p, allowedUsers: p.allowedUsers, isMaintenance: p.isMaintenance, maintenanceMessage: p.maintenanceMessage } : p
      ))
      toast.error('อัปเดตการเข้าถึงล้มเหลว')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">{'กำลังโหลด...'}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link href="/" className="btn-glow inline-flex items-center px-6 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg text-slate-700 dark:text-slate-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group border border-white/20 dark:border-slate-700/50">
            <ArrowLeft className="mr-3 group-hover:-translate-x-1 transition-transform duration-300" size={20} />
            <span className="font-medium">กลับหน้าหลัก</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg rounded-xl border border-white/30 dark:border-slate-600/30"
          >
            <Shield className="text-indigo-600 dark:text-indigo-400" size={20} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ระบบจัดการการเข้าถึง</span>
          </motion.div>
        </motion.div>

        {/* Statistics and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Statistics */}
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">ทั้งหมด</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">เปิดใช้งาน</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.active}</div>
              </div>
              <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">ปิดปรับปรุง</div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.maintenance}</div>
              </div>
              <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">ผู้ใช้ทั้งหมด</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.totalUsers}</div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาหน้าเว็บ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'maintenance' | 'active')}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="all">แสดงทั้งหมด</option>
                <option value="active">เปิดใช้งาน</option>
                <option value="maintenance">ปิดปรับปรุง</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 dark:border-neutral-800 overflow-hidden"
        >
          <div className="p-6 md:p-8 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">จัดการการเข้าถึง</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">กำหนดสิทธิ์การเข้าถึงหน้าเว็บและโหมดการบำรุงรักษา</p>
              </div>
            </div>
          </div>

          {/* Pages Grid */}
          <div className="p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredPages.map((page, index) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.8 + index * 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{page.page}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${page.isMaintenance ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {page.allowedUsers.length} ผู้ใช้ • {page.isMaintenance ? 'ปิดปรับปรุง' : 'เปิดใช้งาน'}
                          </span>
                        </div>
                        {page.isMaintenance && page.maintenanceMessage && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 truncate max-w-48" title={page.maintenanceMessage}>
                            "{page.maintenanceMessage}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => updatePageAccess(page.id, page.allowedUsers, !page.isMaintenance, page.maintenanceMessage)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        page.isMaintenance
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                      }`}
                    >
                      {page.isMaintenance ? <EyeOff size={16} /> : <Eye size={16} />}
                      {page.isMaintenance ? 'ปิดปรับปรุง' : 'เปิดใช้งาน'}
                    </button>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      setSelectedPage(page)
                      setShowModal(true)
                    }}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    จัดการการเข้าถึง
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Access Modal */}
      <AnimatePresence>
        {showModal && selectedPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield size={20} className="text-indigo-500" />
                  {selectedPage.page}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-96 overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  {/* Users Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Users size={20} className="text-indigo-500" />
                      เลือกผู้ใช้ที่อนุญาต
                    </h3>

                    {/* Selected Users Tags */}
                    {selectedPage.allowedUsers.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">ผู้ใช้ที่เลือก ({selectedPage.allowedUsers.length})</p>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          {selectedPage.allowedUsers.map(userId => {
                            const user = users.find(u => u.id === userId)
                            return user ? (
                              <motion.span
                                key={userId}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                              >
                                <span>{user.username}</span>
                                <button
                                  onClick={() => {
                                    const newUsers = selectedPage.allowedUsers.filter(id => id !== userId)
                                    setSelectedPage({ ...selectedPage, allowedUsers: newUsers })
                                  }}
                                  className="hover:bg-indigo-200 dark:hover:bg-indigo-800/50 rounded-full p-0.5 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </motion.span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}

                    {/* Individual User Selection */}
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">เลือกผู้ใช้ทีละคน</p>
                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                        {users.map((user) => {
                          const isSelected = selectedPage.allowedUsers.includes(user.id)
                          return (
                            <motion.button
                              key={user.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                const newUsers = isSelected
                                  ? selectedPage.allowedUsers.filter(id => id !== user.id)
                                  : [...selectedPage.allowedUsers, user.id]
                                setSelectedPage({ ...selectedPage, allowedUsers: newUsers })
                              }}
                              className={`p-3 rounded-lg border transition-all duration-200 ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-indigo-500 border-indigo-500'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                <span className="text-sm font-medium">{user.username}</span>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Settings size={20} className="text-slate-500 dark:text-slate-400" />
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              โหมดการบำรุงรักษา
                            </span>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              ปิดการเข้าถึงหน้าเว็บชั่วคราว
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedPage({ ...selectedPage, isMaintenance: !selectedPage.isMaintenance })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            selectedPage.isMaintenance
                              ? 'bg-orange-500'
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              selectedPage.isMaintenance ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {selectedPage.isMaintenance && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            ข้อความแจ้งเตือน (ไม่บังคับ)
                          </label>
                          <textarea
                            value={selectedPage.maintenanceMessage || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value.length <= 500) { // Limit to 500 characters
                                setSelectedPage({ ...selectedPage, maintenanceMessage: value })
                              }
                            }}
                            placeholder="ป้อนข้อความที่จะแสดงเมื่อเข้าถึงหน้าเว็บนี้..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900 dark:text-white resize-none"
                            rows={3}
                            maxLength={500}
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {(selectedPage.maintenanceMessage || '').length}/500 ตัวอักษร
                          </p>

                          {/* Preview */}
                          {selectedPage.maintenanceMessage && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ตัวอย่างการแสดงผล:</p>
                              <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl p-4 text-center">
                                <div className="text-orange-400 text-lg font-bold mb-2">🔧 ปิดปรับปรุง</div>
                                <p className="text-slate-300 text-sm">{selectedPage.maintenanceMessage}</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    updatePageAccess(selectedPage.id, selectedPage.allowedUsers, selectedPage.isMaintenance, selectedPage.maintenanceMessage)
                    setShowModal(false)
                  }}
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .btn-glow {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
          transition: all 0.3s ease;
        }

        .btn-glow:hover {
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }

        .multi-select {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .multi-select::-webkit-scrollbar {
          width: 6px;
        }

        .multi-select::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .multi-select::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .multi-select::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .dark .multi-select {
          scrollbar-color: #475569 #334155;
        }

        .dark .multi-select::-webkit-scrollbar-track {
          background: #334155;
        }

        .dark .multi-select::-webkit-scrollbar-thumb {
          background: #475569;
        }

        .dark .multi-select::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        .checkbox-modern {
          appearance: none;
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.375rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          position: relative;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .checkbox-modern:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .checkbox-modern:checked {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .checkbox-modern:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          animation: checkmark 0.3s ease-out;
        }

        @keyframes checkmark {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .dark .checkbox-modern {
          border-color: #475569;
          background: linear-gradient(135deg, #334155 0%, #475569 100%);
        }

        .dark .checkbox-modern:hover {
          border-color: #64748b;
        }

        .dark .checkbox-modern:checked {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.3);
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .dark .custom-scrollbar {
          scrollbar-color: #475569 #334155;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #334155;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}