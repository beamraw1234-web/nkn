"use client"

import { useTheme } from './ThemeProvider'

export function SeasonalDecorations() {
  const { currentTheme } = useTheme()

  if (currentTheme === 'default') return null

  return (
    <div className="fixed inset-0 pointer-events-none z-5">
      {currentTheme === 'christmas' && (
        <>
          {/* Christmas tree in corner */}
          <div className="absolute top-4 right-4 w-16 h-16 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon points="50,10 30,50 70,50" fill="#16a34a" />
              <polygon points="50,30 35,60 65,60" fill="#16a34a" />
              <polygon points="50,45 40,70 60,70" fill="#16a34a" />
              <rect x="47" y="70" width="6" height="15" fill="#92400e" />
              <circle cx="35" cy="35" r="3" fill="#eab308" />
              <circle cx="65" cy="40" r="3" fill="#eab308" />
              <circle cx="50" cy="55" r="3" fill="#dc2626" />
            </svg>
          </div>
        </>
      )}

      {currentTheme === 'newyear' && (
        <>
          {/* 2025 in corner */}
          <div className="absolute top-4 left-4 text-6xl font-bold opacity-10 text-yellow-500">
            2025
          </div>
          {/* Firework burst effect */}
          <div className="absolute bottom-4 right-4 w-20 h-20 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="50" cy="50" r="10" fill="#fbbf24" />
              {/* Burst lines */}
              {Array.from({ length: 12 }, (_, i) => (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={50 + Math.cos(i * 30 * Math.PI / 180) * 35}
                  y2={50 + Math.sin(i * 30 * Math.PI / 180) * 35}
                  stroke="#fbbf24"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        </>
      )}

      {currentTheme === 'winter' && (
        <>
          {/* Snowflake pattern */}
          <div className="absolute top-8 right-8 w-12 h-12 opacity-15">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <g stroke="#e2e8f0" strokeWidth="2" fill="none">
                {/* Center */}
                <circle cx="50" cy="50" r="3" fill="#e2e8f0" />
                {/* Arms */}
                <line x1="50" y1="20" x2="50" y2="80" />
                <line x1="20" y1="50" x2="80" y2="50" />
                <line x1="32" y1="32" x2="68" y2="68" />
                <line x1="68" y1="32" x2="32" y2="68" />
                {/* Branches */}
                <line x1="50" y1="20" x2="45" y2="30" />
                <line x1="50" y1="20" x2="55" y2="30" />
                <line x1="50" y1="80" x2="45" y2="70" />
                <line x1="50" y1="80" x2="55" y2="70" />
                <line x1="20" y1="50" x2="30" y2="45" />
                <line x1="20" y1="50" x2="30" y2="55" />
                <line x1="80" y1="50" x2="70" y2="45" />
                <line x1="80" y1="50" x2="70" y2="55" />
              </g>
            </svg>
          </div>
        </>
      )}

      {currentTheme === 'loykrathong' && (
        <>
          {/* Floating lantern in corner */}
          <div className="absolute bottom-4 left-4 w-16 h-20 opacity-20">
            <svg viewBox="0 0 80 100" className="w-full h-full">
              {/* Lantern body */}
              <rect x="25" y="20" width="30" height="50" rx="15" fill="#ea580c" />
              {/* Lantern top */}
              <rect x="30" y="10" width="20" height="15" rx="10" fill="#ea580c" />
              {/* Handle */}
              <path d="M 35 10 Q 40 5 45 10" stroke="#92400e" strokeWidth="2" fill="none" />
              {/* Light glow */}
              <ellipse cx="40" cy="45" rx="12" ry="8" fill="#fbbf24" opacity="0.6" />
              {/* Flame */}
              <path d="M 38 35 Q 40 30 42 35 L 41 40 Z" fill="#fbbf24" />
            </svg>
          </div>
          {/* Small stars */}
          <div className="absolute top-6 right-6 w-8 h-8 opacity-30">
            <svg viewBox="0 0 50 50" className="w-full h-full">
              <polygon points="25,5 28,18 42,18 31,27 35,40 25,32 15,40 19,27 8,18 22,18" fill="#ea580c" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}