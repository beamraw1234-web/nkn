"use client"

import { useState } from 'react'
import { useTheme, SeasonalTheme } from './ThemeProvider'
import { ChevronDown, Snowflake, Star, Zap, Heart, Sun } from 'lucide-react'

const themeOptions: { value: SeasonalTheme; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'default',
    label: 'ปกติ',
    icon: <Sun size={16} />,
    description: 'ธีมปกติ'
  },
  {
    value: 'christmas',
    label: 'คริสต์มาส',
    icon: <Snowflake size={16} />,
    description: 'สีแดง เขียว ทอง + หิมะตก'
  },
  {
    value: 'newyear',
    label: 'ปีใหม่',
    icon: <Star size={16} />,
    description: 'สีทอง ดำ แดง + ดาวตก'
  },
  {
    value: 'winter',
    label: 'ฤดูหนาว',
    icon: <Snowflake size={16} />,
    description: 'สีน้ำเงิน ขาว เทา + หิมะ'
  },
  {
    value: 'loykrathong',
    label: 'ลอยกระทง',
    icon: <Heart size={16} />,
    description: 'สีส้ม เหลือง น้ำตาล + โคมลอย'
  }
]

interface ThemeSelectorProps {
  className?: string
  showDescription?: boolean
}

export function ThemeSelector({ className = '', showDescription = true }: ThemeSelectorProps) {
  const { currentTheme, setCurrentTheme, isAdmin } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const currentThemeOption = themeOptions.find(option => option.value === currentTheme) || themeOptions[0]

  const handleThemeChange = async (theme: SeasonalTheme) => {
    setCurrentTheme(theme)
    setIsOpen(false)

    // If admin, save to server
    if (isAdmin) {
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonalTheme: theme })
        })
      } catch (error) {
        console.error('Failed to save theme:', error)
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors min-w-35"
      >
        {currentThemeOption.icon}
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {currentThemeOption.label}
        </span>
        <ChevronDown
          size={16}
          className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg z-20">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  currentTheme === option.value
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                    : ''
                }`}
              >
                {option.icon}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  {showDescription && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  )}
                </div>
                {currentTheme === option.value && (
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}