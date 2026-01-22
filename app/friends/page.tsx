"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, Check, X, Search, Loader2, ArrowLeft, Phone } from 'lucide-react'
import GroupVoiceCall from '@/components/GroupVoiceCall'
import { PublicRooms } from '@/components/PublicRooms'
import { CreatePublicRoomModal } from '@/components/CreatePublicRoomModal'

interface ModalConfig {
  isOpen: boolean
  title: string
  message: string
  type: 'confirm' | 'alert'
  onConfirm?: () => void
  onCancel?: () => void
}

interface User {
  id: string
  username: string
  nickname: string | null
  profilePicture: string | null
  friendshipStatus: 'none' | 'friend' | 'sent' | 'received'
  friendshipId?: string
}

interface FriendRequest {
  id: string
  createdAt: string
  user: {
    id: string
    username: string
    nickname: string | null
    profilePicture: string | null
  }
}

export default function FriendsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'requests' | 'history' | 'public-rooms'>('friends')
  const [users, setUsers] = useState<User[]>([])
  const [friends, setFriends] = useState<User[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  })
  const [activeCall, setActiveCall] = useState<{ callId: string; mode: 'PRIVATE' | 'ANONYMOUS'; creatorId?: string } | null>(null)
  const [voiceCallMode, setVoiceCallMode] = useState<'PRIVATE' | 'ANONYMOUS'>('PRIVATE')
  const [callHistory, setCallHistory] = useState<Array<{
    callId: string
    startedAt?: string | null
    endedAt?: string | null
    status?: string | null
    roomName?: string | null
    mode?: string | null
    creatorId?: string | null
    participantCount?: number | null
    duration?: number | null
  }>>([])
  const [showJoinCallModal, setShowJoinCallModal] = useState(false)
  const [joinCallId, setJoinCallId] = useState('')
  const [createdCallId, setCreatedCallId] = useState<string | null>(null)
  const [showCreatePublicRoomModal, setShowCreatePublicRoomModal] = useState(false)

  const hasQuery = search.trim().length > 0

  const showModal = (config: Omit<ModalConfig, 'isOpen'>) => {
    setModal({ ...config, isOpen: true })
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }))
  }

  // Session guard: redirect to login if session expires
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    loadFriends()
    loadRequests()
    loadCallHistory()
  }, [])

  // Send heartbeat to update online status
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/chat/heartbeat', {
          method: 'POST',
          credentials: 'include'
        })
      } catch (error) {
        // Silently fail
      }
    }

    sendHeartbeat() // Send immediately
    const interval = setInterval(sendHeartbeat, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Check online status of friends every 5 seconds
  useEffect(() => {
    const checkOnlineStatus = async () => {
      if (friends.length === 0) return
      try {
        const friendIds = friends.map(f => f.id)
        const res = await fetch('/api/chat/online-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userIds: friendIds })
        })
        const data = await res.json()
        if (res.ok) {
          setOnlineStatus(data.status || {})
        }
      } catch (error) {
        console.error('Error checking online status:', error)
      }
    }

    checkOnlineStatus()
    const interval = setInterval(checkOnlineStatus, 5000) // Every 5 seconds for faster updates
    return () => clearInterval(interval)
  }, [friends])

  useEffect(() => {
    if (activeTab === 'all') {
      loadUsers()
    }
  }, [activeTab, search])

  const loadUsers = async () => {
    const query = search.trim()
    if (!query) {
      setUsers([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/users/all?search=${encodeURIComponent(query)}`, {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) {
        // Filter out duplicates by id/username and remove current user
        const uniqueUsers: User[] = data.users.reduce((acc: User[], current: User) => {
          const exists = acc.find(
            (user) => user.id === current.id || user.username.toLowerCase() === current.username.toLowerCase()
          )
          if (!exists) acc.push(current)
          return acc
        }, [])

        const currentUserId = session?.user && 'id' in session.user ? (session.user as { id?: string }).id : undefined
        const currentUsernames = [session?.user?.username, session?.user?.email]
          .filter((v): v is string => Boolean(v))
          .map((v) => v.toLowerCase())

        const filtered: User[] = uniqueUsers.filter((u: User) => {
          const username = u.username.toLowerCase()
          const idMatch = currentUserId ? u.id === currentUserId : false
          const usernameMatch = currentUsernames.includes(username)
          return !idMatch && !usernameMatch
        })

        setUsers(filtered)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/friends', {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) {
        setFriends(data.friends)
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests', {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  const loadCallHistory = async () => {
    try {
      const res = await fetch('/api/voice-calls/history', {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) {
        setCallHistory(data.calls || [])
      }
    } catch (error) {
      console.error('Error loading call history:', error)
    }
  }

  const startVoiceCall = async (mode: 'PRIVATE' | 'ANONYMOUS') => {
    try {
      const res = await fetch('/api/voice-calls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode, participantIds: [] })
      })

      if (res.ok) {
        const data = await res.json()
        setCreatedCallId(data.callId)
        // Store mode for later use when entering room
        setVoiceCallMode(mode)
        // Close the mode selection modal to show success modal instead
        closeModal()
        // Success modal will show automatically when createdCallId is set
      } else {
        showModal({
          title: 'ข้อผิดพลาด',
          message: 'เกิดข้อผิดพลาดในการสร้างห้องพูดคุย',
          type: 'alert'
        })
      }
    } catch (error) {
      console.error('Error starting voice call:', error)
      showModal({
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการสร้างห้องพูดคุย',
        type: 'alert'
      })
    }
  }

  const joinVoiceCall = async () => {
    if (!joinCallId.trim()) {
      showModal({
        title: 'ข้อผิดพลาด',
        message: 'กรุณากรอก Call ID',
        type: 'alert'
      })
      return
    }

    try {
      const res = await fetch('/api/voice-calls/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ callId: joinCallId })
      })

      if (res.ok) {
        const data = await res.json()
        setActiveCall({ callId: joinCallId, mode: data.voiceCall.mode, creatorId: data.voiceCall.creatorId })
        setJoinCallId('')
        setShowJoinCallModal(false)
      } else {
        const data = await res.json()
        showModal({
          title: 'ข้อผิดพลาด',
          message: data.error || 'ไม่พบห้องพูดคุยหรือห้องพูดคุยปิดแล้ว',
          type: 'alert'
        })
      }
    } catch (error) {
      console.error('Error joining voice call:', error)
      showModal({
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการเข้าร่วมห้องพูดคุย',
        type: 'alert'
      })
    }
  }

  const showVoiceCallModal = () => {
    showModal({
      title: 'เลือกโหมดห้องพูดคุย',
      message: 'เลือกโหมดที่ต้องการสำหรับห้องพูดคุยกลุ่ม',
      type: 'confirm',
      onConfirm: () => startVoiceCall(voiceCallMode),
      onCancel: closeModal
    })
  }

  const sendFriendRequest = async (friendId: string) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId })
      })
      
      if (res.ok) {
        showModal({
          title: 'สำเร็จ',
          message: 'ส่งคำขอเพื่อนแล้ว',
          type: 'alert'
        })
        loadUsers()
        
        // Trigger notification refresh for the recipient
        window.dispatchEvent(new CustomEvent('notification:refresh'))
      } else {
        const data = await res.json()
        showModal({
          title: 'ข้อผิดพลาด',
          message: data.error || 'เกิดข้อผิดพลาด',
          type: 'alert'
        })
      }
    } catch (error) {
      showModal({
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาด',
        type: 'alert'
      })
    }
  }

  const handleRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      })
      
      if (res.ok) {
        showModal({
          title: 'สำเร็จ',
          message: action === 'accept' ? 'ยอมรับคำขอแล้ว' : 'ปฏิเสธคำขอแล้ว',
          type: 'alert'
        })
        loadRequests()
        loadFriends()
      }
    } catch (error) {
      showModal({
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาด',
        type: 'alert'
      })
    }
  }

  const removeFriend = async (friendshipId: string) => {
    showModal({
      title: 'ยืนยันการลบเพื่อน',
      message: 'ต้องการลบเพื่อนหรือไม่?',
      type: 'confirm',
      onConfirm: async () => {
        closeModal()
        try {
          const res = await fetch(`/api/friends/requests/${friendshipId}`, {
            method: 'DELETE',
            credentials: 'include'
          })
          
          if (res.ok) {
            const data = await res.json()
            showModal({
              title: 'สำเร็จ',
              message: 'ลบเพื่อนแล้ว',
              type: 'alert'
            })
            loadFriends()
            // Dispatch event เพื่อ sync กับ chat
            if (data.deletedFriendId) {
              window.dispatchEvent(new CustomEvent('friend:deleted', { 
                detail: { friendId: data.deletedFriendId } 
              }))
            }
          }
        } catch (error) {
          showModal({
            title: 'ข้อผิดพลาด',
            message: 'เกิดข้อผิดพลาด',
            type: 'alert'
          })
        }
      },
      onCancel: closeModal
    })
  }

  return (
    <div className="min-h-screen relative py-12 px-4">
      {/* Session loading check */}
      {status === 'loading' && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur z-50">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      )}

      {/* If session expired, prevent rendering */}
      {status === 'unauthenticated' && (
        <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-50">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      )}

      {/* Only render content if session is valid */}
      {status === 'authenticated' && (
      <>
      {/* Ambient shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-10 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center px-4 py-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-white dark:hover:bg-neutral-800 transition-all mb-8 group border border-gray-200 dark:border-neutral-800">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          กลับหน้าหลัก
        </Link>

        {/* Hero / Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl border border-white/30 dark:border-slate-800/60 bg-white/65 dark:bg-slate-900/50 backdrop-blur-2xl shadow-[0_20px_80px_-30px_rgba(0,0,0,0.45)] overflow-hidden"
        >
          <div className="relative px-6 py-4 sm:px-8 sm:py-5">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.3),transparent_30%),radial-gradient(circle_at_60%_60%,rgba(14,165,233,0.25),transparent_28%)]" />
            <div className="relative flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-cyan-500 via-blue-500 to-purple-600 text-white grid place-items-center shadow-lg shadow-cyan-500/40">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">จัดการเพื่อน</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">จัดการเพื่อน คำขอ และค้นหาผู้ใช้ได้ในที่เดียว</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="relative mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="w-full sm:w-auto overflow-x-auto overflow-y-hidden">
                <div className="inline-flex rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 p-1 shadow-sm backdrop-blur min-w-max sm:min-w-0">
                  {(
                    [
                      { key: 'friends', label: 'เพื่อน', icon: Users },
                      { key: 'requests', label: 'คำขอ', icon: UserPlus },
                      { key: 'all', label: 'ค้นหา', icon: Search },
                      { key: 'public-rooms', label: 'ห้องสาธารณะ', icon: Phone },
                      { key: 'history', label: 'ประวัติห้องพูดคุย', icon: Phone },
                    ] as const
                  ).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`relative px-3 sm:px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all whitespace-nowrap text-sm sm:text-base ${
                        activeTab === key
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {activeTab === key && (
                        <motion.span
                          layoutId="pill"
                          className="absolute inset-0 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 shadow-lg"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="relative z-10 hidden sm:inline">{label}</span>
                      {key === 'friends' && friends.length > 0 && (
                        <span className="relative z-10 px-1.5 py-0.5 rounded-lg bg-white/80 text-cyan-700 text-xs font-bold">
                          {friends.length}
                        </span>
                      )}
                      {key === 'requests' && requests.length > 0 && (
                        <span className="relative z-10 px-1.5 py-0.5 rounded-lg bg-red-500 text-white text-xs font-bold">
                          {requests.length}
                        </span>
                      )}
                      {key === 'history' && callHistory.length > 0 && (
                        <span className="relative z-10 px-1.5 py-0.5 rounded-lg bg-white/80 text-cyan-700 text-xs font-bold">
                          {callHistory.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Voice Call Buttons - Stack on mobile */}
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
                <motion.button
                  onClick={() => setShowCreatePublicRoomModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50 hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Phone className="w-4 h-4" />
                  <span>สร้างห้องพูดคุย</span>
                </motion.button>

                <motion.button
                  onClick={() => setShowJoinCallModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/50 hover:from-blue-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Phone className="w-4 h-4" />
                  <span>เข้าร่วมห้องพูดคุย</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search (for 'all' tab) */}
        {activeTab === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="w-full max-w-2xl mx-auto">
              <div className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-gradient-to-r from-white/90 to-white/80 dark:from-slate-800/90 dark:to-slate-900/80 border border-cyan-500/20 dark:border-cyan-500/20 shadow-lg shadow-cyan-500/5 hover:shadow-cyan-500/10 transition-shadow backdrop-blur-xl">
                <Search className="w-5 h-5 text-cyan-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="พิมพ์ชื่อผู้ใช้ / ชื่อที่แสดง"
                  className="flex-1 bg-transparent focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
                />
                {!hasQuery && <span className="text-xs text-slate-400">พิมพ์คำค้นเพื่อเริ่มค้นหา</span>}
              </div>
            </div>
          </motion.div>
        )}

        {/* Content */}
        <div className="max-w-5xl mx-auto space-y-4">
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-500" />
            </div>
          )}

          {/* Friends List */}
          {activeTab === 'friends' && !loading && (
            <>
              {friends.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-400/20 to-blue-500/20 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center text-4xl">🤝</div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">ยังไม่มีเพื่อน</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">เริ่มเพิ่มเพื่อนหรือค้นหาผู้ใช้ด้านบน</p>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {friends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/60 dark:to-slate-900/40 border border-white/40 dark:border-slate-700/50 p-4 md:p-6 flex flex-col items-center gap-3 md:gap-4 shadow-lg hover:shadow-xl hover:border-cyan-500/30 transition-all duration-300"
                    >
                      <div className="relative">
                        <div className="w-16 md:w-20 h-16 md:h-20 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg group-hover:scale-110 transition-transform">
                          {(friend.nickname || friend.username).charAt(0).toUpperCase()}
                        </div>
                        {onlineStatus[friend.id] === true && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 md:w-5 md:h-5 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 shadow-lg"></span>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base md:text-lg line-clamp-1">
                          {friend.nickname || friend.username}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                          @{friend.username}
                          {onlineStatus[friend.id] === true ? ' · ออนไลน์' : ''}
                        </p>
                      </div>
                      <div className="flex justify-center w-full gap-2">
                        <a
                          href={`/chat?friendId=${friend.id}`}
                          className="flex-1 px-3 md:px-6 py-2 md:py-3 rounded-2xl bg-cyan-500 text-white hover:bg-cyan-600 active:scale-95 transition-all text-xs md:text-sm font-bold shadow-md hover:shadow-lg"
                        >
                          แชท
                        </a>
                        <button
                          onClick={() => friend.friendshipId ? removeFriend(friend.friendshipId) : showModal({
                            title: 'ข้อผิดพลาด',
                            message: 'ไม่พบข้อมูลเพื่อนที่จะลบ',
                            type: 'alert'
                          })}
                          className="flex-1 px-3 md:px-6 py-2 md:py-3 rounded-2xl bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all text-xs md:text-sm font-bold shadow-md hover:shadow-lg"
                        >
                          ลบ
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Friend Requests */}
          {activeTab === 'requests' && !loading && (
            <>
              {requests.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-amber-400/20 to-red-500/20 backdrop-blur-md border border-amber-400/30 flex items-center justify-center text-4xl">📫</div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">ไม่มีคำขอเพื่อน</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">เมื่อมีคำขอจะปรากฏที่นี่</p>
                  </div>
                </motion.div>
              ) : (
                requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/40 p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xl"
                  >
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow flex-shrink-0">
                        {(request.user.nickname || request.user.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base line-clamp-1">
                          {request.user.nickname || request.user.username}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">@{request.user.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleRequest(request.id, 'accept')}
                        className="flex-1 sm:flex-none p-2 md:p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow"
                      >
                        <Check className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => handleRequest(request.id, 'reject')}
                        className="flex-1 sm:flex-none p-2 md:p-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow"
                      >
                        <X className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </>
          )}

          {/* All Users */}
          {activeTab === 'all' && !loading && (
            <>
              {!hasQuery ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-slate-400/20 to-slate-500/20 backdrop-blur-md border border-slate-400/30 flex items-center justify-center text-4xl">🔍</div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">ค้นหาชื่อผู้ใช้หรือชื่อที่แสดง</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">พิมพ์คำค้นเพื่อแสดงผลลัพธ์ จะไม่โชว์รายชื่อทั้งหมด</p>
                  </div>
                </motion.div>
              ) : users.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-slate-400/20 to-slate-500/20 backdrop-blur-md border border-slate-400/30 flex items-center justify-center text-4xl">🔎</div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">ไม่พบผู้ใช้</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">ลองค้นหาด้วยคำอื่น</p>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {users.map((user) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/80 via-white/70 to-white/60 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/40 border border-white/40 dark:border-slate-700/50 p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-lg hover:shadow-xl hover:border-cyan-500/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                          {(user.nickname || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base line-clamp-1">
                            {user.nickname || user.username}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">@{user.username}</p>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto">
                        {user.friendshipStatus === 'none' && (
                          <button
                            onClick={() => sendFriendRequest(user.id)}
                            className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-all text-xs md:text-sm font-semibold shadow-lg hover:shadow-cyan-500/50 flex items-center justify-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">เพิ่มเพื่อน</span>
                            <span className="sm:hidden">เพิ่ม</span>
                          </button>
                        )}
                        {user.friendshipStatus === 'sent' && (
                          <span className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-xs md:text-sm font-semibold shadow-md flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                            <span className="hidden sm:inline">รอยืนยัน</span>
                            <span className="sm:hidden text-xs">รอ</span>
                          </span>
                        )}
                        {user.friendshipStatus === 'friend' && (
                          <a
                            href={`/chat?friendId=${user.id}`}
                            className="w-full sm:w-auto px-4 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all text-xs md:text-sm font-semibold shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2"
                          >
                            แชท
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Public Rooms */}
          {activeTab === 'public-rooms' && !loading && session?.user?.id && session?.user?.username && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PublicRooms 
                userId={session.user.id as string} 
                userName={session.user.username}
                onRoomJoined={(room) => {
                  setActiveCall({
                    callId: room.callId,
                    mode: (room.mode as 'PRIVATE' | 'ANONYMOUS') || 'ANONYMOUS',
                    creatorId: room.creator?.id
                  })
                }}
              />
            </motion.div>
          )}

          {/* Call History */}
          {activeTab === 'history' && !loading && (
            <>
              {callHistory.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-slate-400/20 to-slate-500/20 backdrop-blur-md border border-slate-400/30 flex items-center justify-center text-4xl">📞</div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">ไม่มีประวัติห้องพูดคุย</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">ประวัติห้องพูดคุยจะปรากฏที่นี่</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {callHistory.map((call, index) => (
                    <motion.div
                      key={`${call.callId}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/60 dark:to-slate-900/40 border border-white/40 dark:border-slate-700/50 p-6 shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                            call.mode === 'PRIVATE'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                          }`}>
                            {call.mode === 'PRIVATE' ? '🔒' : '🌐'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">
                              {call.roomName || (call.mode === 'PRIVATE' ? 'ห้องพูดคุยส่วนตัว' : 'ห้องพูดคุยสาธารณะ')}
                            </h3>
                            <div className="text-sm text-slate-600 dark:text-slate-400 flex flex-wrap gap-2">
                              <span>{call.participantCount} ผู้เข้าร่วม</span>
                              {call.duration ? (
                                <span>• ระยะเวลา {Math.floor(call.duration / 60)} นาที {call.duration % 60} วินาที</span>
                              ) : (
                                <span>• ไม่พบเวลาใช้งาน</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex flex-wrap gap-2">
                              <span>เริ่ม {call.startedAt ? new Date(call.startedAt).toLocaleString('th-TH') : '-'}</span>
                              {call.endedAt ? (
                                <span>• จบ {new Date(call.endedAt).toLocaleString('th-TH')}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          call.status === 'ENDED'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }`}>
                          {call.status === 'ENDED' ? '✓ จบการสนทนา' : '● กำลังใช้งาน'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Voice Call Modal Selection */}
      {modal.isOpen && modal.title === 'เลือกโหมดห้องพูดคุย' && (
        <AnimatePresence>
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeModal}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20 dark:border-slate-800"
              >
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  เลือกโหมดห้องพูดคุย
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                  เลือกโหมดที่ต้องการสำหรับห้องพูดคุยกลุ่ม
                </p>
                
                <div className="space-y-3 mb-6">
                  {/* Private Mode */}
                  <motion.button
                    onClick={() => setVoiceCallMode('PRIVATE')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                      voiceCallMode === 'PRIVATE'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-1">🔒</span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">ห้องพูดคุยส่วนตัว</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          ห้องพูดคุยระหว่างเพื่อน เก็บประวัติการสนทนา
                        </p>
                      </div>
                      {voiceCallMode === 'PRIVATE' && (
                        <Check className="w-5 h-5 text-blue-500 ml-auto mt-1" />
                      )}
                    </div>
                  </motion.button>

                  {/* Anonymous Mode */}
                  <motion.button
                    onClick={() => setVoiceCallMode('ANONYMOUS')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                      voiceCallMode === 'ANONYMOUS'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-1">🌐</span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">ห้องพูดคุยสาธารณะ</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          ห้องพูดคุยเปิด ทุกคนสามารถเข้าร่วมได้
                        </p>
                      </div>
                      {voiceCallMode === 'ANONYMOUS' && (
                        <Check className="w-5 h-5 text-purple-500 ml-auto mt-1" />
                      )}
                    </div>
                  </motion.button>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 transition-all font-bold"
                  >
                    ยกเลิก
                  </button>
                  <motion.button
                    onClick={() => startVoiceCall(voiceCallMode)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 active:scale-95 transition-all font-bold shadow-lg"
                  >
                    สร้างห้องพูดคุย
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        </AnimatePresence>
      )}

      {/* Custom Modal - Keep existing for other modals */}
      <AnimatePresence>
        {modal.isOpen && modal.title !== 'เลือกโหมดห้องพูดคุย' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={modal.type === 'alert' ? closeModal : modal.onCancel}
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/20 dark:border-slate-800"
              >
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {modal.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {modal.message}
                </p>
                <div className="flex gap-3 justify-end">
                  {modal.type === 'confirm' ? (
                    <>
                      <button
                        onClick={modal.onCancel}
                        className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 transition-all font-bold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={modal.onConfirm}
                        className="px-6 py-3 rounded-2xl bg-cyan-500 text-white hover:bg-cyan-600 active:scale-95 transition-all font-bold"
                      >
                        ตกลง
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-2xl bg-cyan-500 text-white hover:bg-cyan-600 active:scale-95 transition-all font-bold"
                    >
                      ตกลง
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Created Call ID Modal - Show call ID for sharing */}
      <AnimatePresence>
        {createdCallId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20 dark:border-slate-800"
              >
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  🎉 สร้างห้องพูดคุยสำเร็จ!
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                  แชร์รหัสห้อง (ID) นี้กับคนที่อยากเข้าร่วมห้องพูดคุย
                </p>

                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-4 mb-6 border border-cyan-200 dark:border-cyan-700/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">รหัสห้อง</p>
                  <p className="font-mono text-xl font-bold text-slate-900 dark:text-white break-all">{createdCallId}</p>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.button
                    onClick={async () => {
                      await navigator.clipboard.writeText(createdCallId)
                      // Show toast notification instead of modal
                      const toast = document.createElement('div')
                      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-bounce'
                      toast.textContent = '✓ คัดลอกรหัสสำเร็จ!'
                      document.body.appendChild(toast)
                      setTimeout(() => {
                        toast.style.transition = 'opacity 0.3s'
                        toast.style.opacity = '0'
                        setTimeout(() => document.body.removeChild(toast), 300)
                      }, 2000)
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold transition-all"
                  >
                    📋 คัดลอกรหัส
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      // Enter the room with the created call ID
                      setActiveCall({ callId: createdCallId, mode: voiceCallMode as 'PRIVATE' | 'ANONYMOUS', creatorId: session?.user?.id as string })
                      setCreatedCallId('')
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold transition-all"
                  >
                    🎤 เข้าห้อง
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Join Call Modal */}
      <AnimatePresence>
        {showJoinCallModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setShowJoinCallModal(false)
                setJoinCallId('')
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20 dark:border-slate-800"
              >
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  📞 เข้าร่วมห้องพูดคุย
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                  กรุณากรอกรหัสห้องเพื่อเข้าร่วมห้องพูดคุย
                </p>

                <input
                  type="text"
                  value={joinCallId}
                  onChange={(e) => setJoinCallId(e.target.value)}
                  placeholder="กรอกรหัสห้องที่นี่"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 mb-6"
                />

                <div className="flex gap-3 justify-end">
                  <motion.button
                    onClick={() => {
                      setShowJoinCallModal(false)
                      setJoinCallId('')
                    }}
                    className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all"
                  >
                    ยกเลิก
                  </motion.button>
                  <motion.button
                    onClick={joinVoiceCall}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 font-bold transition-all"
                  >
                    เข้าร่วม
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      
      {/* Active Voice Call */}
      <AnimatePresence>
        {activeCall && session?.user?.id && (
          <GroupVoiceCall
            callId={activeCall.callId}
            userId={session.user.id as string}
            username={session.user.username}
            creatorId={activeCall.creatorId}
            mode={activeCall.mode}
            onCallEnd={() => {
              setActiveCall(null)
              loadCallHistory()
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Public Room Modal */}
      <CreatePublicRoomModal
        isOpen={showCreatePublicRoomModal}
        onClose={() => setShowCreatePublicRoomModal(false)}
        onRoomCreated={(callId, isPublic) => {
          setActiveCall({
            callId,
            mode: isPublic ? 'ANONYMOUS' : 'PRIVATE',
            creatorId: session?.user?.id as string
          })
        }}
      />
      </>
      )}
    </div>
  )
}
