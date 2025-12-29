'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function BackgroundManager() {
  const { theme } = useTheme()
  const [backgroundType, setBackgroundType] = useState('grid')
  const [backgroundValue, setBackgroundValue] = useState('')
  const [backgroundGridColor, setBackgroundGridColor] = useState<string | null>(null)
  const [backgroundGridAlpha, setBackgroundGridAlpha] = useState<string | null>(null)
  const [backgroundGridAuto, setBackgroundGridAuto] = useState<boolean | null>(null)
  const [backgroundBlur, setBackgroundBlur] = useState<string | number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/settings')
      .then(res => res.json())
        .then(data => {
          if (data.backgroundType) setBackgroundType(data.backgroundType)
          if (data.backgroundValue) setBackgroundValue(data.backgroundValue)
          if (data.backgroundGridColor) setBackgroundGridColor(data.backgroundGridColor)
          if (typeof data.backgroundGridAlpha !== 'undefined') setBackgroundGridAlpha(data.backgroundGridAlpha || null)
          if (typeof data.backgroundBlur !== 'undefined') setBackgroundBlur(data.backgroundBlur || 0)
          // backgroundGridAuto may come as string 'true'/'false' from the API; parse explicitly
          if (typeof data.backgroundGridAuto !== 'undefined') {
            if (data.backgroundGridAuto === 'true' || data.backgroundGridAuto === true) setBackgroundGridAuto(true)
            else if (data.backgroundGridAuto === 'false' || data.backgroundGridAuto === false) setBackgroundGridAuto(false)
            else setBackgroundGridAuto(Boolean(data.backgroundGridAuto))
          }
        })
  }, [])

  if (!mounted) return null

  const blurValue = backgroundBlur ? parseInt(backgroundBlur.toString()) : 0

  if (backgroundType === 'image' && backgroundValue) {
    return (
      <div 
        className="fixed inset-0 -z-50 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ 
          backgroundImage: `url(${backgroundValue})`,
          filter: blurValue > 0 ? `blur(${blurValue}px)` : 'none'
        }}
      />
    )
  }

  // Default Grid Pattern
  const bgColor = theme === 'dark' ? '#0a0a0a' : '#f9fafb'

  // compute grid line color:
  // If admin specified `backgroundGridColor`, use that (allow hex or rgba).
  // Otherwise auto compute based on bg brightness.
  function hexToRgb(hex: string) {
    const clean = hex.replace('#','')
    const full = clean.length === 3 ? clean.split('').map(c=>c+c).join('') : clean
    const bigint = parseInt(full, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return { r, g, b }
  }

  function hexToRgba(hex: string, alpha = 0.06) {
    try {
      const { r, g, b } = hexToRgb(hex)
      return `rgba(${r},${g},${b},${alpha})`
    } catch (e) {
      return `rgba(0,0,0,${alpha})`
    }
  }

  function rgbToLuminance(r: number, g: number, b: number) {
    // relative luminance calculation
    const a = [r, g, b].map(v => {
      v = v / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
  }

  let gridColor = ''
  const useAuto = backgroundGridAuto === null ? true : backgroundGridAuto

  if (!useAuto && backgroundGridColor) {
    // determine alpha: priority -> backgroundGridAlpha (if set) -> default 0.06
    const alpha = backgroundGridAlpha ? parseFloat(backgroundGridAlpha) : 0.06
    if (backgroundGridColor.startsWith('#')) gridColor = hexToRgba(backgroundGridColor, isNaN(alpha) ? 0.06 : alpha)
    else {
      // if color is rgba already, but alpha override provided, try to inject
      if (backgroundGridColor.startsWith('rgba') && backgroundGridAlpha) {
        try {
          const parts = backgroundGridColor.replace(/rgba?\(|\)/g, '').split(',')
          const r = parts[0].trim(), g = parts[1].trim(), b = parts[2].trim()
          const a = isNaN(parseFloat(backgroundGridAlpha)) ? parts[3]?.trim() || '0.06' : backgroundGridAlpha
          gridColor = `rgba(${r},${g},${b},${a})`
        } catch (e) {
          gridColor = backgroundGridColor
        }
      } else {
        gridColor = backgroundGridColor
      }
    }
  } else {
    // Auto mode or no manual color: use theme preference — light: black lines, dark: white lines
    const alpha = backgroundGridAlpha ? parseFloat(backgroundGridAlpha) : 0.06
    const safeAlpha = isNaN(alpha) ? 0.06 : alpha
    gridColor = theme === 'dark' ? `rgba(255,255,255,${safeAlpha})` : `rgba(0,0,0,${safeAlpha})`
  }

  // If a manual color was provided but it has poor contrast with the background,
  // adjust it to a contrasting color so it remains visible when theme changes.
  if (!useAuto && backgroundGridColor && backgroundGridColor.startsWith('#')) {
    try {
      const { r, g, b } = hexToRgb(backgroundGridColor)
      const lum = rgbToLuminance(r, g, b)
      // threshold chosen: very bright (>0.85) or very dark (<0.15)
      const alpha = backgroundGridAlpha ? parseFloat(backgroundGridAlpha) : 0.06
      if (theme === 'light' && lum > 0.85) {
        // too light on light background -> use black lines with provided alpha
        gridColor = `rgba(0,0,0,${isNaN(alpha) ? 0.06 : alpha})`
      } else if (theme === 'dark' && lum < 0.15) {
        // too dark on dark background -> use white lines
        gridColor = `rgba(255,255,255,${isNaN(alpha) ? 0.06 : alpha})`
      }
    } catch (e) {
      // ignore and keep gridColor
    }
  }

  return (
    <div 
      className="fixed inset-0 -z-50 transition-colors duration-500"
      style={{
        backgroundImage: `
          linear-gradient(to right, ${gridColor} 1px, transparent 1px),
          linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        backgroundColor: bgColor
      }}
    />
  )
}
