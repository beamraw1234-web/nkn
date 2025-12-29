"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from './ThemeProvider'

interface RainDrop {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
  thickness: number
}

interface Splat {
  x: number
  y: number
  size: number
  opacity: number
  life: number
  maxLife: number
}

interface SnowFlake {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  sway: number
  swayOffset: number
}

interface WindParticle {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  length: number
}

interface ShootingStar {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
  angle: number
  life: number
  maxLife: number
  trail: { x: number; y: number; opacity: number }[]
}

interface WeatherEffectProps {
  theme?: string
  speed?: number
  color?: string
  intensity?: number
  enabled?: boolean
}

export function WeatherEffect({
  theme: propTheme,
  speed: propSpeed,
  color: propColor,
  intensity: propIntensity,
  enabled: propEnabled = true
}: WeatherEffectProps = {}) {
  const { currentTheme, themeSettings } = useTheme()
  const theme = propTheme || currentTheme
  const enabled = propEnabled && themeSettings.effectEnabled

  const [effect, setEffect] = useState('none')
  const [speed, setSpeed] = useState(propSpeed || themeSettings.effectSpeed || 1)
  const [color, setColor] = useState(propColor || themeSettings.effectColor || '#ffffff')
  const [intensity, setIntensity] = useState(propIntensity || themeSettings.effectIntensity || 1)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const rainDropsRef = useRef<RainDrop[]>([])
  const snowFlakesRef = useRef<SnowFlake[]>([])
  const windParticlesRef = useRef<WindParticle[]>([])
  const shootingStarsRef = useRef<ShootingStar[]>([])
  const splatsRef = useRef<Splat[]>([])

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const newWidth = window.innerWidth
    const newHeight = window.innerHeight

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth
      canvas.height = newHeight

      // Initialize particles based on effect
      if (effect === 'rain' || effect === 'storm') {
        const count = Math.floor((newWidth / 12) * intensity)
        rainDropsRef.current = Array.from({ length: count }, () => ({
          x: Math.random() * newWidth,
          y: -100 - Math.random() * 300,
          length: 15 + Math.random() * 30,
          speed: (5 + Math.random() * 8) * speed,
          opacity: 0.5 + Math.random() * 0.5,
          thickness: 1.2 + Math.random() * 1
        }))
      } else if (effect === 'snow') {
        const count = Math.floor((newWidth / 25) * intensity)
        snowFlakesRef.current = Array.from({ length: count }, () => ({
          x: Math.random() * newWidth,
          y: Math.random() * -100,
          size: 2 + Math.random() * 4,
          speed: (1 + Math.random() * 2) * speed,
          opacity: 0.6 + Math.random() * 0.4,
          sway: Math.random() * 2 - 1,
          swayOffset: Math.random() * Math.PI * 2
        }))
      } else if (effect === 'wind') {
        const count = Math.floor((newWidth / 30) * intensity)
        windParticlesRef.current = Array.from({ length: count }, () => ({
          x: Math.random() * newWidth,
          y: Math.random() * newHeight,
          size: 1,
          speed: (3 + Math.random() * 5) * speed,
          opacity: 0.3 + Math.random() * 0.4,
          length: 8 + Math.random() * 12
        }))
      }
      // Shooting stars are created dynamically, not pre-initialized
    }
  }, [intensity, speed, effect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const updateObstacles = () => {
      // ไม่ต้องเก็บ obstacles แล้ว เพราะแค่ใช้ตรวจ collision
    }

    updateObstacles()

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [updateCanvasSize])

  useEffect(() => {
    // Determine effect based on theme
    if (theme && theme !== 'default') {
      switch (theme) {
        case 'christmas':
          setEffect('snow')
          setColor(themeSettings.effectColor || '#ffffff')
          break
        case 'winter':
          setEffect('snow')
          setColor(themeSettings.effectColor || '#e2e8f0')
          break
        case 'newyear':
          setEffect('stars')
          setColor(themeSettings.effectColor || '#fbbf24')
          break
        default:
          setEffect('none')
      }
      setSpeed(themeSettings.effectSpeed || 1)
      setIntensity(themeSettings.effectIntensity || 1)
    } else {
      // Fallback to API settings for non-seasonal themes
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setEffect(data.weatherEffect || 'none')
          setSpeed(data.weatherSpeed || 1)
          setColor(data.weatherColor || '#ffffff')
          setIntensity(data.weatherIntensity || 1.2)
        })
        .catch(() => {
          setEffect('none')
        })
    }
  }, [theme, themeSettings])

  useEffect(() => {
    if (effect === 'none') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initialize particles if needed
    const needsInit = (
      (effect === 'rain' || effect === 'storm') && rainDropsRef.current.length === 0 ||
      (effect === 'snow') && snowFlakesRef.current.length === 0 ||
      (effect === 'wind') && windParticlesRef.current.length === 0
    )
    if (needsInit) updateCanvasSize()

    const animate = () => {
      updateCanvasSize()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (effect === 'rain' || effect === 'storm') {
        ctx.strokeStyle = color
        ctx.fillStyle = color

        rainDropsRef.current.forEach(drop => {
          drop.y += drop.speed

          let hit = false

          // ตรวจ collision กับ .obstacle
          const obstacles = document.querySelectorAll('.obstacle')
          for (const el of obstacles) {
            const rect = el.getBoundingClientRect()
            if (
              drop.x >= rect.left &&
              drop.x <= rect.right &&
              drop.y >= rect.top - 30 &&
              drop.y <= rect.top + 40
            ) {
              hit = true

              // Splat เบา ๆ ชัด ๆ แต่ไม่เยอะ
              splatsRef.current.push({
                x: drop.x,
                y: rect.top + 10,
                size: 6 + Math.random() * 10,
                opacity: 1,
                life: 0,
                maxLife: 20
              })

              break
            }
          }

          if (hit || drop.y > canvas.height + 100) {
            drop.y = -100 - Math.random() * 200
            drop.x = Math.random() * canvas.width
          } else {
            ctx.globalAlpha = drop.opacity
            ctx.lineWidth = drop.thickness
            ctx.beginPath()
            ctx.moveTo(drop.x, drop.y)
            ctx.lineTo(drop.x, drop.y + drop.length)
            ctx.stroke()
          }
        })

        // วาด splat จางหาย
        splatsRef.current = splatsRef.current.filter(s => {
          s.life++
          const p = s.life / s.maxLife
          ctx.globalAlpha = (1 - p) * 0.8
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size * p, 0, Math.PI * 2)
          ctx.fill()
          return s.life < s.maxLife
        })
      } else if (effect === 'snow') {
        ctx.fillStyle = color

        // Initialize snowflakes if needed
        if (snowFlakesRef.current.length === 0) {
          const count = Math.floor((canvas.width / 25) * intensity)
          snowFlakesRef.current = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -100,
            size: 2 + Math.random() * 4,
            speed: (1 + Math.random() * 2) * speed,
            opacity: 0.6 + Math.random() * 0.4,
            sway: Math.random() * 2 - 1,
            swayOffset: Math.random() * Math.PI * 2
          }))
        }

        snowFlakesRef.current.forEach(flake => {
          flake.y += flake.speed
          flake.x += Math.sin(flake.y * 0.01 + flake.swayOffset) * flake.sway

          if (flake.y > canvas.height) {
            flake.y = -10
            flake.x = Math.random() * canvas.width
          }

          ctx.globalAlpha = flake.opacity
          ctx.beginPath()
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2)
          ctx.fill()
        })
      } else if (effect === 'wind') {
        ctx.strokeStyle = color

        // Initialize wind particles if needed
        if (windParticlesRef.current.length === 0) {
          const count = Math.floor((canvas.width / 30) * intensity)
          windParticlesRef.current = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 1,
            speed: (3 + Math.random() * 5) * speed,
            opacity: 0.3 + Math.random() * 0.4,
            length: 8 + Math.random() * 12
          }))
        }

        windParticlesRef.current.forEach(particle => {
          particle.x += particle.speed

          if (particle.x > canvas.width + 50) {
            particle.x = -50
            particle.y = Math.random() * canvas.height
          }

          ctx.globalAlpha = particle.opacity
          ctx.lineWidth = particle.size
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(particle.x + particle.length, particle.y)
          ctx.stroke()
        })
      } else if (effect === 'sun') {
        // Draw sun
        const sunX = canvas.width - 100
        const sunY = 100
        const sunRadius = 60

        // Sun glow
        const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 2)
        gradient.addColorStop(0, color + '80')
        gradient.addColorStop(0.5, color + '40')
        gradient.addColorStop(1, color + '00')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(sunX, sunY, sunRadius * 2, 0, Math.PI * 2)
        ctx.fill()

        // Sun rays
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        for (let i = 0; i < 12; i++) {
          const angle = (i * 30) * Math.PI / 180
          const rayLength = 30 + Math.sin(Date.now() * 0.005 + i) * 10

          ctx.beginPath()
          ctx.moveTo(
            sunX + Math.cos(angle) * (sunRadius + 10),
            sunY + Math.sin(angle) * (sunRadius + 10)
          )
          ctx.lineTo(
            sunX + Math.cos(angle) * (sunRadius + 10 + rayLength),
            sunY + Math.sin(angle) * (sunRadius + 10 + rayLength)
          )
          ctx.stroke()
        }

        // Sun center
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
        ctx.fill()
      } else if (effect === 'stars') {
        // Shooting stars effect
        ctx.strokeStyle = color
        ctx.fillStyle = color

        // Create new shooting star occasionally
        if (Math.random() < 0.005 * intensity) {
          const startX = Math.random() * canvas.width
          const startY = Math.random() * canvas.height * 0.3 // Start in top 30%
          const angle = Math.PI / 4 + Math.random() * Math.PI / 2 // 45-135 degrees
          const starSpeed = (8 + Math.random() * 12) * speed

          shootingStarsRef.current.push({
            x: startX,
            y: startY,
            length: 80 + Math.random() * 120,
            speed: starSpeed,
            opacity: 1,
            angle: angle,
            life: 0,
            maxLife: 60 + Math.random() * 40,
            trail: []
          })
        }

        // Update and draw shooting stars
        shootingStarsRef.current = shootingStarsRef.current.filter(star => {
          star.life++

          // Move star
          star.x += Math.cos(star.angle) * star.speed
          star.y += Math.sin(star.angle) * star.speed

          // Update trail
          star.trail.push({ x: star.x, y: star.y, opacity: star.opacity })
          if (star.trail.length > 20) {
            star.trail.shift()
          }

          // Update opacity
          star.opacity = 1 - (star.life / star.maxLife)

          // Draw trail
          star.trail.forEach((point, index) => {
            const trailOpacity = (point.opacity * (index / star.trail.length)) * 0.8
            ctx.globalAlpha = trailOpacity
            ctx.beginPath()
            ctx.arc(point.x, point.y, 1 + (star.trail.length - index) * 0.1, 0, Math.PI * 2)
            ctx.fill()
          })

          // Draw star head
          ctx.globalAlpha = star.opacity
          ctx.beginPath()
          ctx.arc(star.x, star.y, 2 + star.opacity * 3, 0, Math.PI * 2)
          ctx.fill()

          // Draw star streak
          const streakLength = star.length * star.opacity
          const endX = star.x - Math.cos(star.angle) * streakLength
          const endY = star.y - Math.sin(star.angle) * streakLength

          ctx.beginPath()
          ctx.moveTo(star.x, star.y)
          ctx.lineTo(endX, endY)
          ctx.lineWidth = 2 + star.opacity * 2
          ctx.stroke()

          return star.life < star.maxLife && star.x > -100 && star.x < canvas.width + 100 && star.y > -100 && star.y < canvas.height + 100
        })
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [effect, speed, color, intensity, updateCanvasSize])

  if (effect === 'none' || !enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: 'transparent' }}
    />
  )
}
