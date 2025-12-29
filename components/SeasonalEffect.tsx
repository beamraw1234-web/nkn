"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from './ThemeProvider'

interface FloatingLantern {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  sway: number
  swayOffset: number
}

interface TwinklingStar {
  x: number
  y: number
  size: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

export function SeasonalEffect() {
  const { currentTheme, themeSettings } = useTheme()
  const enabled = themeSettings.effectEnabled
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lanternsRef = useRef<FloatingLantern[]>([])
  const starsRef = useRef<TwinklingStar[]>([])

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const newWidth = window.innerWidth
    const newHeight = window.innerHeight

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth
      canvas.height = newHeight

      // Initialize particles based on theme
      if (currentTheme === 'loykrathong') {
        const count = Math.floor((newWidth / 150) * themeSettings.effectIntensity)
        lanternsRef.current = Array.from({ length: count }, () => ({
          x: Math.random() * newWidth,
          y: newHeight + Math.random() * 200,
          size: 15 + Math.random() * 25,
          speed: (0.5 + Math.random() * 1) * themeSettings.effectSpeed,
          opacity: 0.6 + Math.random() * 0.4,
          sway: Math.random() * 2 - 1,
          swayOffset: Math.random() * Math.PI * 2
        }))
      } else if (currentTheme === 'christmas' || currentTheme === 'winter') {
        // Use existing snow effect from WeatherEffect
        // This will be handled by the WeatherEffect component
      } else if (currentTheme === 'newyear') {
        // Use existing stars effect from WeatherEffect
        // This will be handled by the WeatherEffect component
      }
    }
  }, [currentTheme, themeSettings.effectIntensity, themeSettings.effectSpeed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [updateCanvasSize])

  useEffect(() => {
    if (!enabled || currentTheme === 'default') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initialize particles if needed
    const needsInit = (
      (currentTheme === 'loykrathong') && lanternsRef.current.length === 0
    )
    if (needsInit) updateCanvasSize()

    const animate = () => {
      updateCanvasSize()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (currentTheme === 'loykrathong') {
        ctx.fillStyle = themeSettings.effectColor || '#ea580c'

        // Initialize lanterns if needed
        if (lanternsRef.current.length === 0) {
          const count = Math.floor((canvas.width / 150) * themeSettings.effectIntensity)
          lanternsRef.current = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * 200,
            size: 15 + Math.random() * 25,
            speed: (0.5 + Math.random() * 1) * themeSettings.effectSpeed,
            opacity: 0.6 + Math.random() * 0.4,
            sway: Math.random() * 2 - 1,
            swayOffset: Math.random() * Math.PI * 2
          }))
        }

        lanternsRef.current.forEach(lantern => {
          lantern.y -= lantern.speed
          lantern.x += Math.sin(lantern.y * 0.01 + lantern.swayOffset) * lantern.sway

          if (lantern.y < -50) {
            lantern.y = canvas.height + Math.random() * 200
            lantern.x = Math.random() * canvas.width
          }

          ctx.globalAlpha = lantern.opacity
          ctx.beginPath()
          ctx.arc(lantern.x, lantern.y, lantern.size, 0, Math.PI * 2)
          ctx.fill()

          // Add lantern glow
          const gradient = ctx.createRadialGradient(
            lantern.x, lantern.y, 0,
            lantern.x, lantern.y, lantern.size * 2
          )
          gradient.addColorStop(0, themeSettings.effectColor + '40')
          gradient.addColorStop(1, themeSettings.effectColor + '00')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(lantern.x, lantern.y, lantern.size * 2, 0, Math.PI * 2)
          ctx.fill()
        })
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [currentTheme, themeSettings.effectEnabled, themeSettings.effectSpeed, themeSettings.effectIntensity, themeSettings.effectColor, updateCanvasSize])

  // Don't render canvas for themes handled by WeatherEffect
  if (!enabled || currentTheme === 'default' ||
      currentTheme === 'christmas' || currentTheme === 'winter' || currentTheme === 'newyear') {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: 'transparent' }}
    />
  )
}