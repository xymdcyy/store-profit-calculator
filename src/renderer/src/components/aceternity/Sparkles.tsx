import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Sparkle {
  id: number
  x: number
  y: number
  size: number
  color: string
}

interface SparklesProps {
  children: React.ReactNode
  color?: string
  count?: number
  disabled?: boolean
}

const random = (min: number, max: number) => Math.random() * (max - min) + min

export function Sparkles({
  children,
  color = '#E4002B',
  count = 5,
  disabled = false,
}: SparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (disabled) return

    const interval = setInterval(() => {
      const newSparkle: Sparkle = {
        id: Date.now(),
        x: random(0, 100),
        y: random(0, 100),
        size: random(4, 8),
        color,
      }
      setSparkles((prev) => [...prev.slice(-count), newSparkle])
    }, 800)

    return () => clearInterval(interval)
  }, [color, count, disabled])

  return (
    <span ref={containerRef} className="relative inline-block">
      {children}
      <AnimatePresence>
        {!disabled &&
          sparkles.map((sparkle) => (
            <motion.span
              key={sparkle.id}
              className="pointer-events-none absolute"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                fontSize: sparkle.size,
              }}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: 180 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <svg
                width={sparkle.size}
                height={sparkle.size}
                viewBox="0 0 24 24"
                fill={sparkle.color}
              >
                <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" />
              </svg>
            </motion.span>
          ))}
      </AnimatePresence>
    </span>
  )
}
