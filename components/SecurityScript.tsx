'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
export function SecurityScript() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Fetch security setting
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setIsEnabled(Boolean(data.enabled)))
      .catch(() => setIsEnabled(false))  // Default to false if API fails
  }, [])

  useEffect(() => {
    if (!isEnabled) return

    // Show a one-time toast notification
    toast('ระบบความปลอดภัย เปิดใช้งาน — ป้องกันการกด F12 และคลิกขวา', { icon: '🔒' })

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEnabled])

  return null
}
