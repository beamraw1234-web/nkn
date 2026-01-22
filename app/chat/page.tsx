"use client"

import { useEffect, useState, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Send, Paperclip, ArrowLeft, Loader2, Download, Trash2, File as FileIcon } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  fileMime?: string | null
  filePreview?: string | null
  timestamp?: string
  createdAt?: string
  sender?: {
    id: string
    username: string
    nickname: string | null
    profilePicture: string | null
  }
}

interface Friend {
  id: string
  username: string
  nickname: string | null
  profilePicture: string | null
}

function ChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const friendId = searchParams.get('friendId')

  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [friend, setFriend] = useState<Friend | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isFriendOnline, setIsFriendOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentUserId && socket && isConnected) {
      socket.emit('user:join', currentUserId)
      const roomId = [currentUserId, friendId].sort().join('_')
      socket.emit('chat:join', roomId)
    }
  }, [currentUserId, socket, isConnected, friendId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send heartbeat to update online status
  useEffect(() => {
    if (!currentUserId) return

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/chat/heartbeat', {
          method: 'POST',
          credentials: 'include'
        })
      } catch {
        // Silently fail
      }
    }

    sendHeartbeat() // Send immediately
    const interval = setInterval(sendHeartbeat, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [currentUserId])

  // Check friend's online status
  useEffect(() => {
    if (!friendId) return

    const checkOnlineStatus = async () => {
      try {
        const res = await fetch('/api/chat/online-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userIds: [friendId] })
        })
        const data = await res.json()
        if (res.ok && data.status) {
          setIsFriendOnline(data.status[friendId] || false)
        }
      } catch {
        // Silently fail
      }
    }

    checkOnlineStatus() // Check immediately
    const interval = setInterval(checkOnlineStatus, 5000) // Every 5 seconds
    return () => clearInterval(interval)
  }, [friendId])

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/validate')
      const data = await res.json()
      if (data.user) {
        setCurrentUserId(data.user.id)
      } else {
        console.error('No user found in validate response')
      }
    } catch {
      console.error('Error loading user')
    }
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?friendId=${friendId}`)
      const data = await res.json()
      
      if (res.ok) {
        setMessages(data.messages)
        if (data.messages.length > 0) {
          const firstMessage = data.messages[0]
          const friendData = firstMessage.sender.id === friendId 
            ? firstMessage.sender 
            : data.messages.find((m: Message) => m.sender?.id === friendId)?.sender

          if (friendData) {
            setFriend(friendData as Friend)
          }
        } else {
          const friendRes = await fetch('/api/friends')
          const friendsData = await friendRes.json()
          const friendInfo = friendsData.friends.find((f: Friend) => f.id === friendId)
          if (friendInfo) {
            setFriend(friendInfo)
          }
        }
      } else {
        toast.error('ไม่สามารถโหลดข้อความได้')
        router.push('/friends')
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }, [friendId, router])

  useEffect(() => {
    if (!friendId) {
      router.push('/friends')
      return
    }

    loadCurrentUser()
    loadMessages()

    const socketInstance = io({
      path: '/socket.io',
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('chat:private:message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    socketInstance.on('chat:private:typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === friendId) {
        setIsTyping(data.isTyping)
      }
    })

    socketInstance.on('chat:deleted', () => {
      setMessages([])
      setIsTyping(false)
      toast('แชทนี้ถูกลบแล้ว', { icon: '🗑️' })
    })

    socketInstance.on('user:online:status', (data: { userId: string; isOnline: boolean }) => {
      if (data.userId === friendId) {
        setIsFriendOnline(data.isOnline)
      }
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [friendId, router, loadCurrentUser, loadMessages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !socket || !isConnected || !friendId || !currentUserId) return

    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Save to database
    const newMessage: Message = {
      id: messageId,
      senderId: currentUserId,
      receiverId: friendId,
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    }

    // Emit via Socket.io
    socket.emit('chat:private:message', newMessage)

    // Save to database via API
    await saveMessage(newMessage)

    setInputValue('')

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socket.emit('chat:private:typing', { senderId: currentUserId, receiverId: friendId, isTyping: false })
  }

  const saveMessage = async (message: Message) => {
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Failed to save message:', res.status, errorData)
        toast.error('ไม่สามารถบันทึกข้อความได้')
      }
    } catch {
      console.error('Error saving message')
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)

    if (!socket || !isConnected) {
      console.log('[Typing] Skipped - socket or connection issue', { socket: !!socket, isConnected })
      return
    }

    console.log('[Typing] Emitting typing event', { senderId: currentUserId, receiverId: friendId, isTyping: true })
    socket.emit('chat:private:typing', { senderId: currentUserId, receiverId: friendId, isTyping: true })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      console.log('[Typing] Emitting stop typing event', { senderId: currentUserId, receiverId: friendId, isTyping: false })
      socket.emit('chat:private:typing', { senderId: currentUserId, receiverId: friendId, isTyping: false })
    }, 2000)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !friendId || !currentUserId) return

    setUploading(true)

    try {
      // สร้าง preview สำหรับรูปภาพ
      let filePreview: string | null = null
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        filePreview = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('friendId', friendId)

      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok && socket) {
        const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const message: Message = {
          id: messageId,
          senderId: currentUserId,
          receiverId: friendId,
          content: `ส่งไฟล์: ${data.file.name}`,
          fileUrl: data.file.url,
          fileName: data.file.name,
          fileSize: data.file.size,
          fileMime: data.file.mime,
          filePreview: filePreview,
          timestamp: new Date().toISOString()
        }

        // Emit with preview (for real-time display)
        socket.emit('chat:private:message', message)
        
        // Save to DB without preview (too large)
        const messageToSave = { ...message, filePreview: null }
        await saveMessage(messageToSave)
        
        toast.success('ส่งไฟล์แล้ว')
      } else {
        toast.error(data.error || 'ไม่สามารถส่งไฟล์ได้')
      }
    } catch {
      console.error('Error uploading file')
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {

        fileInputRef.current.value = ''
      }
    }
  }

  const formatTime = (input?: string) => {
    if (!input) return ''
    const date = new Date(input)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleDeleteChat = async () => {
    if (!currentUserId || !friendId) return
    const ok = window.confirm('ลบแชททั้งหมดระหว่างคุณกับเพื่อนคนนี้? การกระทำนี้จะลบสำหรับทั้งสองฝั่งทันที')
    if (!ok) return

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, friendId })
      })

      const data = await res.json()
      if (res.ok) {
        setMessages([])
        setIsTyping(false)
        if (socket) {
          socket.emit('chat:delete', { senderId: currentUserId, receiverId: friendId })
        }
        toast.success('ลบแชทเรียบร้อย')
      } else {
        toast.error(data.error || 'ไม่สามารถลบแชทได้')
      }
    } catch {
      console.error('Delete chat error')
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col h-screen overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-blue-200/20 dark:border-slate-700/50 shadow-lg shadow-blue-100/10 dark:shadow-black/20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => router.push('/friends')}
              whileHover={{ scale: 1.1, rotate: -180 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </motion.button>
            {friend && (
              <div className="flex items-center gap-3">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  <div className="w-11 h-11 rounded-full bg-linear-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-300/50 dark:shadow-purple-900/50">
                    {(friend.nickname || friend.username).charAt(0).toUpperCase()}
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isFriendOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-400'}`}
                  ></motion.div>
                </motion.div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    {friend.nickname || friend.username}
                  </h2>
                  <div className="flex items-center gap-2">
                    <motion.div 
                      animate={{ opacity: [0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className={`w-1.5 h-1.5 rounded-full ${isFriendOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    ></motion.div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {isFriendOnline ? (
                        <span className="text-emerald-600 dark:text-emerald-400">ออนไลน์</span>
                      ) : (
                        <span>ออฟไลน์</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleDeleteChat}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-2 rounded-xl bg-linear-to-br from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 font-bold text-xs"
              title="ลบแชททั้งหมด"
            >
              <Trash2 className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">ลบแชท</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto space-y-4 pb-20">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-400/20 to-purple-400/20 flex items-center justify-center backdrop-blur-sm border border-blue-200/30">
                  <div className="text-5xl">💬</div>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg">ยังไม่มีข้อความ</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">เริ่มแชทกันเลย!</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {messages.map((message, index) => {
            const isOwnMessage = message.senderId === currentUserId
            return (
              <motion.div
                key={message.id || `msg-${index}`}
                initial={{ opacity: 0, x: isOwnMessage ? 20 : -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`max-w-xs sm:max-w-sm ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                >
                  <div
                    className={`px-4 sm:px-5 py-3 rounded-2xl backdrop-blur-sm transition-all ${
                      isOwnMessage
                        ? 'bg-linear-to-br from-blue-500 to-purple-600 text-white rounded-tr-none shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                        : 'bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-tl-none shadow-md shadow-slate-300/20 dark:shadow-black/30 hover:shadow-lg border border-slate-200/50 dark:border-slate-600/30'
                    }`}
                  >
                    {message.fileUrl ? (
                      <div className="flex flex-col gap-3">
                        {message.filePreview || (message.fileMime && message.fileMime.startsWith('image/')) ? (
                          <motion.a
                            href={message.fileUrl}
                            download={message.fileName}
                            whileHover={{ scale: 1.05 }}
                            className="block hover:opacity-90 transition-opacity rounded-xl overflow-hidden"
                          >
                            <img
                              src={message.filePreview || message.fileUrl}
                              alt={message.fileName || 'image'}
                              className="max-w-xs h-auto rounded-xl object-cover"
                            />
                          </motion.a>
                        ) : null}
                        <motion.a
                          href={message.fileUrl}
                          download={message.fileName}
                          whileHover={{ x: 5 }}
                          className={`flex items-center gap-3 hover:opacity-80 transition-all group p-2 rounded-lg ${isOwnMessage ? 'hover:bg-white/20' : 'hover:bg-slate-100 dark:hover:bg-slate-600/50'}`}
                        >
                          <motion.div 
                            animate={{ rotate: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={`p-2.5 rounded-lg shrink-0 ${isOwnMessage ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'}`}
                          >
                            <FileIcon className="w-5 h-5" />
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{message.fileName}</p>
                            {message.fileSize && (
                              <p className={`text-xs ${isOwnMessage ? 'opacity-75' : 'text-slate-500 dark:text-slate-400'}`}>
                                {formatFileSize(message.fileSize)}
                              </p>
                            )}
                          </div>
                          <Download className="w-4 h-4 ml-1 shrink-0 opacity-50 group-hover:opacity-100" />
                        </motion.a>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 transition-opacity ${isOwnMessage ? 'text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
                    {formatTime(message.timestamp || message.createdAt)}
                  </span>
                </motion.div>
              </motion.div>
            )
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <motion.div
                className="flex items-center gap-3 px-5 py-3 rounded-2xl rounded-tl-none bg-linear-to-br from-blue-400/30 to-purple-400/30 backdrop-blur-md border border-blue-300/30 dark:border-purple-400/30"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-blue-500 to-purple-500"
                />
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
                  className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-blue-500 to-purple-500"
                />
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-blue-500 to-purple-500"
                />
              </motion.div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="sticky bottom-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-blue-200/20 dark:border-slate-700/50 p-3 sm:p-4 shadow-lg shadow-blue-100/10 dark:shadow-black/20">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex gap-3 items-end"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected || uploading}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-xl bg-linear-to-br from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-400/30 hover:shadow-orange-500/50 disabled:shadow-none text-white font-semibold"
              title="ส่งไฟล์"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </motion.button>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              disabled={!isConnected}
              placeholder={isConnected ? 'พิมพ์ข้อความ...' : 'กำลังเชื่อมต่อ...'}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none disabled:opacity-50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all backdrop-blur-sm font-medium"
            />
            <motion.button
              type="submit"
              disabled={!inputValue.trim() || !isConnected}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:shadow-none flex items-center gap-2 font-bold text-sm"
              title="ส่งข้อความ"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">ส่ง</span>
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}
