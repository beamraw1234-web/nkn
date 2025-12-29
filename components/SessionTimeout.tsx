"use client"

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function SessionTimeout() {
  const { data: session } = useSession()
  const [timeoutMinutes, setTimeoutMinutes] = useState(60)
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Fetch session timeout setting
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setTimeoutMinutes(data.sessionTimeoutMinutes || 60))
      .catch(() => setTimeoutMinutes(60))
  }, [])

  // Function to reset timeout
  const resetSessionTimeout = () => {
    if (!session) return

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new logout time
    const newLogoutTime = Date.now() + timeoutMinutes * 60 * 1000
    localStorage.setItem('logoutTime', String(newLogoutTime))

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      localStorage.removeItem('logoutTime')
      toast.error('เซสชันหมดอายุ กำลังออกจากระบบ')
      setTimeout(() => {
        signOut({ redirect: false }).then(() => router.push('/login'))
      }, 2000)
    }, timeoutMinutes * 60 * 1000)
  }

  // Listen to user activity and reset timeout
  useEffect(() => {
    if (!session) return

    // Reset timeout on initial load
    resetSessionTimeout()

    // Event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      resetSessionTimeout()
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [session, timeoutMinutes, router])

  return null
}
