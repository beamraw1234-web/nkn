"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type SeasonalTheme = 'default' | 'christmas' | 'newyear' | 'winter' | 'loykrathong'

export interface ThemeSettings {
  currentTheme: SeasonalTheme
  effectSpeed: number
  effectIntensity: number
  effectMaxParticles: number
  effectEnabled: boolean
  effectColor: string
}

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  button: string
  card: string
  navbar: string
}

interface ThemeContextType {
  currentTheme: SeasonalTheme
  themeSettings: ThemeSettings
  themeColors: ThemeColors
  setCurrentTheme: (theme: SeasonalTheme) => void
  updateThemeSettings: (settings: Partial<ThemeSettings>) => void
  isAdmin: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const getThemeColors = (theme: SeasonalTheme): ThemeColors => {
  switch (theme) {
    case 'christmas':
      return {
        primary: '#dc2626', // red-600
        secondary: '#16a34a', // green-600
        accent: '#eab308', // yellow-500
        background: '#fef7ed', // orange-50
        text: '#1f2937', // gray-800
        button: '#dc2626',
        card: '#ffffff',
        navbar: '#dc2626'
      }
    case 'newyear':
      return {
        primary: '#eab308', // yellow-500
        secondary: '#1f2937', // gray-800
        accent: '#dc2626', // red-600
        background: '#fef7ed', // orange-50
        text: '#1f2937', // gray-800
        button: '#eab308',
        card: '#ffffff',
        navbar: '#eab308'
      }
    case 'winter':
      return {
        primary: '#2563eb', // blue-600
        secondary: '#f8fafc', // slate-50
        accent: '#64748b', // slate-500
        background: '#f1f5f9', // slate-100
        text: '#1e293b', // slate-800
        button: '#2563eb',
        card: '#ffffff',
        navbar: '#2563eb'
      }
    case 'loykrathong':
      return {
        primary: '#ea580c', // orange-600
        secondary: '#fef3c7', // yellow-100
        accent: '#92400e', // amber-800
        background: '#fff7ed', // orange-50
        text: '#1f2937', // gray-800
        button: '#ea580c',
        card: '#ffffff',
        navbar: '#ea580c'
      }
    default:
      return {
        primary: '#3b82f6', // blue-500
        secondary: '#f1f5f9', // slate-100
        accent: '#64748b', // slate-500
        background: '#ffffff',
        text: '#1f2937', // gray-800
        button: '#3b82f6',
        card: '#ffffff',
        navbar: '#3b82f6'
      }
  }
}

interface ThemeProviderProps {
  children: ReactNode
  initialTheme?: SeasonalTheme
  initialSettings?: Partial<ThemeSettings>
  isAdmin?: boolean
}

export function ThemeProvider({
  children,
  initialTheme = 'default',
  initialSettings = {},
  isAdmin = false
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<SeasonalTheme>(initialTheme)
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    currentTheme: initialTheme,
    effectSpeed: 1.0,
    effectIntensity: 1.0,
    effectMaxParticles: 100,
    effectEnabled: true,
    effectColor: '#ffffff',
    ...initialSettings
  })

  const themeColors = getThemeColors(currentTheme)

  const updateThemeSettings = (settings: Partial<ThemeSettings>) => {
    setThemeSettings(prev => ({ ...prev, ...settings }))
  }

  // Load theme settings from API
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setCurrentTheme(data.seasonalTheme || 'default')
          setThemeSettings(prev => ({
            ...prev,
            ...data,
            currentTheme: data.seasonalTheme || 'default'
          }))
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error)
      }
    }

    loadThemeSettings()
  }, [])

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--theme-primary', themeColors.primary)
    root.style.setProperty('--theme-secondary', themeColors.secondary)
    root.style.setProperty('--theme-accent', themeColors.accent)
    root.style.setProperty('--theme-background', themeColors.background)
    root.style.setProperty('--theme-text', themeColors.text)
    root.style.setProperty('--theme-button', themeColors.button)
    root.style.setProperty('--theme-card', themeColors.card)
    root.style.setProperty('--theme-navbar', themeColors.navbar)
  }, [themeColors])

  const handleSetCurrentTheme = (theme: SeasonalTheme) => {
    setCurrentTheme(theme)
    setThemeSettings(prev => ({ ...prev, currentTheme: theme }))
  }

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeSettings,
        themeColors,
        setCurrentTheme: handleSetCurrentTheme,
        updateThemeSettings,
        isAdmin
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}