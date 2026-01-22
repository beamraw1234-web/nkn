'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Globe, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface CreatePublicRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onRoomCreated?: (callId: string, isPublic: boolean) => void
}

export function CreatePublicRoomModal({ isOpen, onClose, onRoomCreated }: CreatePublicRoomModalProps) {
  const [isPublic, setIsPublic] = useState(true)
  const [roomName, setRoomName] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(7)
  const [loading, setLoading] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<{
    callId: string
    inviteToken?: string
  } | null>(null)

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('กรุณาใส่ชื่อห้อง')
      return
    }

    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 20) {
      toast.error('จำนวนคนต้องอยู่ระหว่าง 2-20')
      return
    }

    if (hasPassword && !password.trim()) {
      toast.error('กรุณาใส่รหัสผ่าน')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/voice-calls/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isPublic,
          roomName: roomName.trim(),
          password: hasPassword ? password : undefined,
          maxParticipants,
          generateInviteToken: !isPublic
        })
      })

      if (res.ok) {
        const data = await res.json()
        const created = data?.voiceCall ?? {}
        setCreatedRoom({
          callId: created.callId || data.callId,
          inviteToken: created.inviteToken || data.inviteToken
        })
        toast.success('สร้างห้องสำเร็จ!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'ไม่สามารถสร้างห้องได้')
      }
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setRoomName('')
    setPassword('')
    setHasPassword(false)
    setMaxParticipants(7)
    setIsPublic(true)
    setCreatedRoom(null)
    onClose()
  }

  const handleEnterRoom = () => {
    if (createdRoom) {
      onRoomCreated?.(createdRoom.callId, isPublic)
      handleClose()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('คัดลอกสำเร็จ!')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                สร้างห้องพูดคุย
              </h3>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {!createdRoom ? (
              <>
                {/* Room Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    ประเภทห้อง
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      onClick={() => setIsPublic(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-lg border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                        isPublic
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                          : 'border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                      }`}
                    >
                      <Globe size={18} />
                      สาธารณะ
                    </motion.button>
                    <motion.button
                      onClick={() => setIsPublic(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-lg border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                        !isPublic
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                          : 'border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:border-cyan-300'
                      }`}
                    >
                      <Lock size={18} />
                      ส่วนตัว
                    </motion.button>
                  </div>
                </div>

                {/* Room Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ชื่อห้อง
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="เช่น จุดประชุมทีม หรือ ห้องเรียน"
                    maxLength={50}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {roomName.length}/50
                  </p>
                </div>

                {/* Max Participants */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    จำนวนผู้เข้าร่วมสูงสุด
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={1}
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
                      disabled={loading}
                      className="flex-1 accent-emerald-500"
                    />
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(Number(e.target.value))}
                      disabled={loading}
                      className="w-20 px-2 py-2 text-sm text-center border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ตั้งค่าได้ระหว่าง 2-20 คน
                  </p>
                </div>

                {/* Password */}
                {isPublic && (
                  <div className="mb-6">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={hasPassword}
                        onChange={(e) => setHasPassword(e.target.checked)}
                        disabled={loading}
                        className="w-4 h-4 rounded border-gray-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        เพิ่มรหัสผ่านของห้อง
                      </span>
                    </label>
                    {hasPassword && (
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="ตั้งรหัสผ่าน"
                        disabled={loading}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="mb-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {isPublic ? (
                      <>ห้องสาธารณะจะปรากฏในรายการค้นหาให้ผู้ใช้ทั่วไปสามารถเข้าร่วมได้</>
                    ) : (
                      <>ห้องส่วนตัวจะส่งลิงก์เชิญให้เพื่อนของคุณเท่านั้น</>
                    )}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading || !roomName.trim()}
                    className="flex-1 py-3 px-4 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        สร้างอยู่...
                      </>
                    ) : (
                      <>
                        <Globe size={16} />
                        สร้างห้อง
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              // Success View
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600 dark:text-green-400" />
                </div>
                
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  สร้างห้องสำเร็จ!
                </h4>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                  {isPublic ? 'ห้องของคุณกำลังจะปรากฏในรายการสาธารณะ' : 'คัดลอกลิงก์เชิญเพื่อแชร์ให้เพื่อน'}
                </p>

                {/* Room ID */}
                <div className="mb-4 p-3 bg-gray-100 dark:bg-neutral-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">รหัสห้อง</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white break-all">
                      {createdRoom.callId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdRoom.callId)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                    >
                      <Copy size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Invite Link */}
                {createdRoom.inviteToken && createdRoom.inviteToken !== 'undefined' && (
                  <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      ลิงก์เชิญ (แชร์ให้เพื่อน)
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/friends?invite=${createdRoom.inviteToken}`}
                        readOnly
                        className="flex-1 px-2 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-blue-300 dark:border-blue-700 rounded text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/friends?invite=${createdRoom.inviteToken}`)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                      >
                        <Copy size={16} className="text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    ปิด
                  </button>
                  <button
                    onClick={handleEnterRoom}
                    className="flex-1 py-3 px-4 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all"
                  >
                    เข้าห้อง
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
