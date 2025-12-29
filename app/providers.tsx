'use client'

import { SessionProvider } from "next-auth/react"
import { Toaster } from "react-hot-toast"
import { ThemeProvider, useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function Providers({ children, systemTheme, systemLanguage }: { children: React.ReactNode, systemTheme?: string, systemLanguage?: string }) {
  const [themeState, setThemeState] = useState<string>(systemTheme || 'system')

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      const data = await res.json()
      if (data?.theme) setThemeState(data.theme)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchSettings()
    function onReconnected() {
      fetchSettings()
    }
    window.addEventListener('db:reconnected', onReconnected)
    return () => window.removeEventListener('db:reconnected', onReconnected)
  }, [])

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme={themeState || 'system'} enableSystem disableTransitionOnChange>
        {children}
        <Toaster position="top-center" />
      </ThemeProvider>
    </SessionProvider>
  )
}

