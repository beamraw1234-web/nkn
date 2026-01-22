"use client"

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Users, ArrowLeft } from 'lucide-react'

interface Friend {
  id: string
  username: string
  nickname: string | null
  profilePicture: string | null
}

interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  isRead: boolean
}

interface RealtimeChatProps {
  userId: string
  userName: string
}

export function RealtimeChat({ userId, userName }: RealtimeChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'friends' | 'chat'>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [friendTyping, setFriendTyping] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load friends list
  useEffect(() => {
    if (isOpen && view === 'friends') {
      loadFriends()
      checkOnlineStatus()
    }
  }, [isOpen, view])

  // Load messages when friend is selected
  useEffect(() => {
    if (selectedFriend) {
      loadMessages(selectedFriend.id)
      // Check typing status immediately
      checkTypingStatus(selectedFriend.id)
      // Then check every 500ms for faster updates
      const messageInterval = setInterval(() => loadMessages(selectedFriend.id), 500)
      const typingInterval = setInterval(() => checkTypingStatus(selectedFriend.id), 500)
      return () => {
        clearInterval(messageInterval)
        clearInterval(typingInterval)
      }
    }
  }, [selectedFriend])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check online status periodically
  useEffect(() => {
    if (isOpen && friends.length > 0) {
      // Check immediately on friends change
      checkOnlineStatus()
      const interval = setInterval(checkOnlineStatus, 5000) // Every 5 seconds for faster updates
      return () => clearInterval(interval)
    }
  }, [isOpen, friends])

  // Listen for friend deletion event
  useEffect(() => {
    const handleFriendDeleted = (event: CustomEvent) => {
      const { friendId } = event.detail
      setFriends(prev => prev.filter(f => f.id !== friendId))
      if (selectedFriend?.id === friendId) {
        handleBack()
      }
    }
    const listener = handleFriendDeleted as EventListener
    window.addEventListener('friend:deleted', listener)
    return () => window.removeEventListener('friend:deleted', listener)
  }, [selectedFriend])

  // Send heartbeat to update online status
  useEffect(() => {
    if (isOpen) {
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
      sendHeartbeat()
      const interval = setInterval(sendHeartbeat, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const loadFriends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/friends', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setFriends(data.friends || [])
      } else {
        console.error('Failed to load friends:', data.error)
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (friendId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?friendId=${friendId}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
        
        // Mark messages as read
        const unreadIds = data.messages
          .filter((m: ChatMessage) => !m.isRead && m.receiverId === userId)
          .map((m: ChatMessage) => m.id)
        
        if (unreadIds.length > 0) {
          await fetch('/api/chat/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ messageIds: unreadIds })
          })
        }
      } else {
        console.error('Failed to load messages:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const checkTypingStatus = async (friendId: string) => {
    try {
      const res = await fetch(`/api/chat/typing-status?friendId=${friendId}`, {
        credentials: 'include',
        cache: 'no-store'
      })
      const data = await res.json()
      if (res.ok) {
        setFriendTyping(data.isTyping || false)
      }
    } catch (error) {
      // Silently fail
    }
  }

  const checkOnlineStatus = async () => {
    try {
      const friendIds = friends.map(f => f.id)
      if (friendIds.length === 0) return
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
      // Silently fail
    }
  }

  const updateTypingStatus = async (typing: boolean) => {
    if (!selectedFriend) return
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          friendId: selectedFriend.id,
          isTyping: typing
        })
      })
    } catch (error) {
      // Silently fail
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedFriend || sending) return

    const messageText = inputValue.trim()
    setSending(true)

    // Stop typing indicator
    await updateTypingStatus(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    try {
      // ใช้ /api/chat/send ที่สร้าง notification อัตโนมัติ
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: selectedFriend.id,
          content: messageText
        })
      })

      if (res.ok) {
        setInputValue('')
        // Reload messages immediately
        await loadMessages(selectedFriend.id)
        
        // Trigger notification refresh for receiver
        window.dispatchEvent(new CustomEvent('notification:refresh'))
      } else {
        const error = await res.json()
        console.error('Failed to send message:', error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    
    // Send typing indicator
    if (e.target.value.trim()) {
      updateTypingStatus(true)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false)
      }, 2000)
    } else {
      updateTypingStatus(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend)
    setView('chat')
  }

  const handleBack = () => {
    setSelectedFriend(null)
    setMessages([])
    setView('friends')
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'เมื่อวาน'
    } else if (days < 7) {
      return `${days} วันที่แล้ว`
    } else {
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    }
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-60 p-4 rounded-full shadow-lg bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-60 w-96 max-w-[calc(100vw-3rem)] h-125 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view === 'chat' && selectedFriend && (
                  <button
                    onClick={handleBack}
                    className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <MessageCircle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-white font-semibold">
                    {view === 'chat' && selectedFriend
                      ? selectedFriend.nickname || selectedFriend.username
                      : 'แชทกับเพื่อน'}
                  </h3>
                  {view === 'friends' && (
                    <p className="text-cyan-100 text-xs">เลือกเพื่อนเพื่อเริ่มแชท</p>
                  )}
                  {view === 'chat' && selectedFriend && (
                    <p className="text-cyan-100 text-xs">
                      {friendTyping 
                        ? 'กำลังพิมพ์...' 
                        : onlineStatus[selectedFriend.id] === true 
                          ? 'ออนไลน์' 
                          : 'ออฟไลน์'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setView('friends')
                  setSelectedFriend(null)
                }}
                className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Friends List View */}
            {view === 'friends' && (
              <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
                {loading ? (
                  <div className="p-4 text-center text-neutral-500">
                    กำลังโหลด...
                  </div>
                ) : friends.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
                    <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                      ยังไม่มีเพื่อน
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-500">
                      ไปที่หน้าเพื่อนเพื่อเพิ่มเพื่อนใหม่
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => handleSelectFriend(friend)}
                        className="w-full p-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-3 text-left"
                      >
                        <div className="relative">
                          {friend.profilePicture ? (
                            <img
                              src={friend.profilePicture}
                              alt={friend.nickname || friend.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                              {(friend.nickname || friend.username).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {onlineStatus[friend.id] && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-neutral-900"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-neutral-900 dark:text-white truncate">
                            {friend.nickname || friend.username}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                            @{friend.username}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat View */}
            {view === 'chat' && selectedFriend && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50 dark:bg-neutral-950">
                  {messages.length === 0 ? (
                    <div className="text-center text-neutral-500 dark:text-neutral-400 mt-10">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>ยังไม่มีข้อความ</p>
                      <p className="text-sm">เริ่มส่งข้อความเพื่อแชทกับ {selectedFriend.nickname || selectedFriend.username}</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.senderId === userId
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwnMessage
                                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-sm shadow-sm'
                              }`}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                            </div>
                            <span className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 px-2">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                  {friendTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white dark:bg-neutral-800 px-4 py-2 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendMessage()
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      disabled={sending}
                      placeholder="พิมพ์ข้อความ..."
                      className="flex-1 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 border-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 text-neutral-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || sending}
                      className="p-2 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
