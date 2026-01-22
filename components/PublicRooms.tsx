'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Lock, Unlock, ArrowRight, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface PublicRoom {
  id: string
  callId: string
  roomName: string
  creator: {
    id: string
    username: string
    displayName: string
    profilePicture: string | null
  }
  participantCount: number
  maxParticipants: number
  hasPassword: boolean
  mode: string
  status: string
  createdAt: string
}

interface PublicRoomsProps {
  userId: string
  userName: string
  onRoomJoined?: (room: PublicRoom) => void
}

export function PublicRooms({ userId, userName, onRoomJoined }: PublicRoomsProps) {
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<PublicRoom | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PublicRoom | null>(null)

  useEffect(() => {
    loadPublicRooms()
    const interval = setInterval(loadPublicRooms, 5000) // รีเฟรช ทุก 5 วินาที
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleRoomDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ callId?: string }>
      const deletedCallId = customEvent.detail?.callId
      if (!deletedCallId) return
      setRooms((prev) => prev.filter((room) => room.callId !== deletedCallId))
    }

    window.addEventListener('voice-room-deleted', handleRoomDeleted)
    return () => window.removeEventListener('voice-room-deleted', handleRoomDeleted)
  }, [])

  const loadPublicRooms = async () => {
    try {
      const res = await fetch('/api/voice-calls/public-rooms', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error('Error loading public rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (room: PublicRoom) => {
    if (room.hasPassword) {
      setSelectedRoom(room)
      setShowPasswordModal(true)
      return
    }

    // เข้าห้องโดยไม่มีรหัสผ่าน
    await joinRoom(room, '')
  }

  const handlePasswordSubmit = async () => {
    if (!selectedRoom) return

    if (selectedRoom.hasPassword && !passwordInput.trim()) {
      toast.error('กรุณากรอกรหัสผ่าน')
      return
    }

    await joinRoom(selectedRoom, passwordInput)
  }

  const joinRoom = async (room: PublicRoom, password: string) => {
    setJoiningRoomId(room.callId)
    try {
      const res = await fetch('/api/voice-calls/join-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ callId: room.callId, passwordInput: password })
      })

      if (res.ok) {
        toast.success('เข้าร่วมห้องสำเร็จ')
        setShowPasswordModal(false)
        setPasswordInput('')
        setSelectedRoom(null)
        loadPublicRooms()
        onRoomJoined?.(room)
        
        // ในอนาคต อาจเปลี่ยนไปห้องพูดคุยที่เข้าร่วม
        // window.location.href = `/voice-calls/${callId}`
      } else {
        const data = await res.json()
        toast.error(data.error || 'ไม่สามารถเข้าร่วมห้องได้')
      }
    } catch (error) {
      console.error('Error joining room:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setJoiningRoomId(null)
    }
  }

  const deleteRoom = async (room: PublicRoom) => {
    if (deletingRoomId) return

    setDeletingRoomId(room.callId)
    try {
      const res = await fetch('/api/voice-calls/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ callId: room.callId })
      })

      if (res.ok) {
        toast.success('ลบห้องสำเร็จ')
        setRooms((prev) => prev.filter((item) => item.callId !== room.callId))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('voice-room-deleted', {
              detail: { callId: room.callId }
            })
          )
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'ไม่สามารถลบห้องได้')
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setDeletingRoomId(null)
    }
  }

  const openDeleteConfirm = (room: PublicRoom) => {
    setDeleteTarget(room)
    setShowDeleteConfirm(true)
  }

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

    if (diffMinutes < 1) return 'เพิ่งเลิก'
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    
    return date.toLocaleDateString('th-TH')
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4">กำลังโหลดห้องสาธารณะ...</p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full">
        <div className="mb-6 flex items-center gap-3">
          <Users size={24} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ห้องพูดคุยสาธารณะ
          </h2>
          <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            {rooms.length} ห้อง
          </span>
        </div>

        {rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 p-12 text-center"
          >
            <Users size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              ไม่มีห้องพูดคุยสาธารณะในขณะนี้
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all overflow-hidden"
              >
                <div className="p-5">
                  {/* ชื่อห้อง */}
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 truncate">
                    {room.roomName}
                  </h3>

                  {/* เจ้าของห้อง */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-neutral-800">
                    {room.creator.profilePicture ? (
                      <img
                        src={room.creator.profilePicture}
                        alt={room.creator.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                        {room.creator.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {room.creator.displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{room.creator.username}
                      </p>
                    </div>
                  </div>

                  {/* สถิติห้อง */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {/* จำนวนผู้ใช้ */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {room.participantCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">ผู้ใช้</div>
                    </div>

                    {/* ความจุสูงสุด */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {room.maxParticipants}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">ที่นั่ง</div>
                    </div>

                    {/* สถานะรหัสผ่าน */}
                    <div className="text-center">
                      {room.hasPassword ? (
                        <Lock size={20} className="mx-auto text-red-500 mb-1" />
                      ) : (
                        <Unlock size={20} className="mx-auto text-green-500 mb-1" />
                      )}
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {room.hasPassword ? 'มีรหัส' : 'เปิด'}
                      </div>
                    </div>
                  </div>

                  {/* เวลา */}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    สร้าง {formatDate(room.createdAt)}
                  </p>

                  {/* ปุ่มเข้าร่วม/ลบ */}
                  <div className="flex flex-col gap-2">
                    <motion.button
                      onClick={() => handleJoinRoom(room)}
                      disabled={joiningRoomId === room.callId}
                      whileHover={{ scale: 0.98 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-2 px-4 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningRoomId === room.callId ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          กำลังเข้า...
                        </>
                      ) : (
                        <>
                          เข้าร่วม
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                    {room.creator?.id === userId && (
                      <motion.button
                        onClick={() => openDeleteConfirm(room)}
                        disabled={deletingRoomId === room.callId}
                        whileHover={{ scale: 0.98 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingRoomId === room.callId ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            กำลังลบ...
                          </>
                        ) : (
                          <>ลบห้อง</>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showDeleteConfirm && deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={closeDeleteConfirm}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-neutral-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl dark:bg-red-900/30 dark:text-red-300">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">ยืนยันการลบห้อง</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ต้องการลบห้องนี้ใช่ไหม? การลบไม่สามารถย้อนกลับได้
                    </p>
                  </div>
                </div>

                <div className="mb-5 rounded-lg bg-gray-50 dark:bg-neutral-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  ห้อง: <span className="font-semibold">{deleteTarget.roomName}</span>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeDeleteConfirm}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-100 text-sm font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={async () => {
                      const target = deleteTarget
                      closeDeleteConfirm()
                      if (target) {
                        await deleteRoom(target)
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                  >
                    ลบห้อง
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && selectedRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowPasswordModal(false)
              setPasswordInput('')
              setSelectedRoom(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock size={20} className="text-red-500" />
                  ห้องต้องใส่รหัสผ่าน
                </h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordInput('')
                    setSelectedRoom(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                ห้อง <strong>{selectedRoom.roomName}</strong> ต้องการรหัสผ่าน กรุณากรอกรหัสผ่านเพื่อเข้าร่วม
              </p>

              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handlePasswordSubmit()
                }}
                placeholder="กรอกรหัสผ่าน"
                className="w-full px-4 py-3 mb-6 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={joiningRoomId === selectedRoom.callId}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordInput('')
                    setSelectedRoom(null)
                  }}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={joiningRoomId === selectedRoom.callId}
                  className="flex-1 py-3 px-4 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joiningRoomId === selectedRoom.callId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังเข้า...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      เข้าร่วม
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
