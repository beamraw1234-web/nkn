'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Unlock, Copy, Check, RotateCcw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface RoomSettingsModalProps {
  isOpen: boolean
  callId?: string
  roomName?: string
  hasPassword?: boolean
  maxParticipants?: number
  participantCount?: number
  isCreator?: boolean
  onClose: () => void
  onSettingsUpdated?: () => void
  onRoomDeleted?: () => void
}

export function RoomSettingsModal({
  isOpen,
  callId,
  roomName,
  hasPassword,
  maxParticipants,
  participantCount,
  isCreator,
  onClose,
  onSettingsUpdated,
  onRoomDeleted
}: RoomSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'password' | 'invite' | 'capacity'>('password')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [capacity, setCapacity] = useState<number>(maxParticipants ?? 7)
  const [showRemovePasswordConfirm, setShowRemovePasswordConfirm] = useState(false)
  const [showDeleteRoomConfirm, setShowDeleteRoomConfirm] = useState(false)

  const capacityTooLow = typeof participantCount === 'number' ? capacity < participantCount : false
  const capacityOutOfRange = capacity < 2 || capacity > 20
  const capacityInvalid = capacityTooLow || capacityOutOfRange

  useEffect(() => {
    if (isOpen && callId && activeTab === 'invite') {
      generateInviteLink()
    }
  }, [isOpen, activeTab])

  useEffect(() => {
    if (isOpen) {
      setCapacity(maxParticipants ?? 7)
    }
  }, [isOpen, maxParticipants])

  const generateInviteLink = async () => {
    if (!callId) return

    setLoading(true)
    try {
      const res = await fetch('/api/voice-calls/room-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          callId,
          action: 'generate_invite'
        })
      })

      if (res.ok) {
        const data = await res.json()
        const token = data?.room?.inviteToken ?? data?.inviteToken
        if (!token || token === 'undefined') {
          setInviteToken(null)
          setInviteLink('')
          toast.error('ไม่พบโทเค็นเชิญ')
          return
        }
        setInviteToken(token)
        const link = `${window.location.origin}/friends?invite=${token}`
        setInviteLink(link)
      } else {
        toast.error('ไม่สามารถสร้างลิงก์เชิญได้')
      }
    } catch (error) {
      console.error('Error generating invite link:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (!callId) return

    if (!newPassword.trim()) {
      toast.error('กรุณาใส่รหัสผ่าน')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/voice-calls/room-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          callId,
          action: 'set_password',
          password: newPassword
        })
      })

      if (res.ok) {
        toast.success('ตั้งรหัสผ่านสำเร็จ!')
        setNewPassword('')
        onSettingsUpdated?.()
      } else {
        const data = await res.json()
        toast.error(data.error || 'ไม่สามารถตั้งรหัสผ่านได้')
      }
    } catch (error) {
      console.error('Error setting password:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePassword = async () => {
    if (!callId) return

    setLoading(true)
    try {
      const res = await fetch('/api/voice-calls/room-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          callId,
          action: 'remove_password'
        })
      })

      if (res.ok) {
        toast.success('ลบรหัสผ่านสำเร็จ!')
        setNewPassword('')
        onSettingsUpdated?.()
      } else {
        toast.error('ไม่สามารถลบรหัสผ่านได้')
      }
    } catch (error) {
      console.error('Error removing password:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleSetCapacity = async () => {
    if (!callId) return

    if (capacityInvalid) {
      if (capacityTooLow) {
        toast.error('จำนวนคนต้องไม่น้อยกว่าจำนวนผู้เข้าร่วมปัจจุบัน')
      } else {
        toast.error('จำนวนคนต้องอยู่ระหว่าง 2-20')
      }
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/voice-calls/room-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          callId,
          action: 'set_max_participants',
          maxParticipants: capacity
        })
      })

      if (res.ok) {
        toast.success('อัปเดตจำนวนผู้เข้าร่วมสูงสุดสำเร็จ!')
        onSettingsUpdated?.()
      } else {
        const data = await res.json()
        toast.error(data.error || 'ไม่สามารถอัปเดตจำนวนคนได้')
      }
    } catch (error) {
      console.error('Error setting max participants:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoom = async () => {
    if (!callId) return

    setLoading(true)
    try {
      const res = await fetch('/api/voice-calls/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ callId })
      })

      if (res.ok) {
        toast.success('ลบห้องสำเร็จ')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('voice-room-deleted', {
              detail: { callId }
            })
          )
        }
        onRoomDeleted?.()
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error || 'ไม่สามารถลบห้องได้')
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('คัดลอกสำเร็จ!')
  }

  if (!isCreator) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                ตั้งค่าห้อง
              </h3>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Room Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ชื่อห้อง</p>
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {roomName || 'ห้องพูดคุย'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 pb-3 px-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'password'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock size={16} />
                  <span className="text-sm">รหัสผ่าน</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('invite')}
                className={`flex-1 pb-3 px-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'invite'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Copy size={16} />
                  <span className="text-sm">เชิญ</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('capacity')}
                className={`flex-1 pb-3 px-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'capacity'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users size={16} />
                  <span className="text-sm">จำนวนคน</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'password' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    รหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="ตั้งรหัสผ่านห้อง"
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {hasPassword
                      ? 'ห้องนี้มีรหัสผ่านอยู่ กรุณากรอกรหัสผ่านใหม่เพื่ออัปเดต'
                      : 'ตั้งรหัสผ่านเพื่อจำกัดการเข้าถึงห้องนี้'}
                  </p>
                </div>

                <div className="flex gap-3">
                  {hasPassword && (
                    <button
                      onClick={() => setShowRemovePasswordConfirm(true)}
                      disabled={loading}
                      className="flex-1 py-3 px-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Unlock size={16} />
                      ลบรหัสผ่าน
                    </button>
                  )}
                  <button
                    onClick={handleSetPassword}
                    disabled={loading || !newPassword.trim()}
                    className="flex-1 py-3 px-4 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        บันทึก
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'invite' && (
              <div className="space-y-4">
                {inviteLink ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      แชร์ลิงก์นี้เพื่อให้เพื่อนของคุณเข้าร่วมห้อง
                    </p>
                    <div className="p-3 bg-gray-100 dark:bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={inviteLink}
                          readOnly
                          className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => copyToClipboard(inviteLink)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                        >
                          <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={generateInviteLink}
                      disabled={loading}
                      className="w-full py-3 px-4 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={16} />
                      สร้างลิงก์ใหม่
                    </button>
                  </>
                ) : (
                  <button
                    onClick={generateInviteLink}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        กำลังสร้าง...
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        สร้างลิงก์เชิญ
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {activeTab === 'capacity' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    จำนวนผู้เข้าร่วมสูงสุด
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={1}
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                      disabled={loading}
                      className="flex-1 accent-emerald-500"
                    />
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      disabled={loading}
                      className="w-20 px-2 py-2 text-sm text-center border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ตั้งค่าได้ระหว่าง 2-20 คน
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {typeof participantCount === 'number'
                      ? `ผู้เข้าร่วมปัจจุบัน ${participantCount} คน — ห้ามตั้งค่าน้อยกว่านี้`
                      : 'จำกัดจำนวนคนเพื่อควบคุมคุณภาพการสนทนา'}
                  </p>
                </div>

                {capacityInvalid && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {capacityTooLow
                        ? 'จำนวนคนต้องไม่น้อยกว่าจำนวนผู้เข้าร่วมปัจจุบัน'
                        : 'จำนวนคนต้องอยู่ระหว่าง 2-20'}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSetCapacity}
                  disabled={loading || capacityInvalid}
                  className="w-full py-3 px-4 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      บันทึกจำนวนคน
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ปิด
            </button>
            
            {/* Danger Zone */}
            <div className="mt-4 p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
              <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">โซนอันตราย</div>
              <button
                onClick={() => setShowDeleteRoomConfirm(true)}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ลบห้อง
              </button>
              <p className="text-xs text-red-600 dark:text-red-300 mt-2">การลบห้องจะลบถาวรและผู้เข้าร่วมทั้งหมดจะหลุดจากห้อง</p>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Remove Password Confirm Modal */}
      <AnimatePresence>
        {showRemovePasswordConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRemovePasswordConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ยืนยันการลบรหัสผ่าน</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">ต้องการลบรหัสผ่านของห้องนี้หรือไม่?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemovePasswordConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    setShowRemovePasswordConfirm(false)
                    await handleRemovePassword()
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    
      {/* Delete Room Confirm Modal */}
      <AnimatePresence>
        {showDeleteRoomConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteRoomConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ยืนยันการลบห้อง</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">ต้องการลบห้องนี้ใช่ไหม? การลบไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteRoomConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    setShowDeleteRoomConfirm(false)
                    await handleDeleteRoom()
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  ลบห้อง
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
