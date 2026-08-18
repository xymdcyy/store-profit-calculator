import { useState, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface GlowingCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
  disabled?: boolean
}

export function GlowingCard({
  children,
  className,
  glowColor = 'rgba(228, 0, 43, 0.15)',
  disabled = false,
}: GlowingCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-300',
        isHovered && !disabled && 'border-[var(--primary)]/30 shadow-lg shadow-[var(--primary)]/5',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={disabled ? {} : { y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect - clipped container */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        {isHovered && !disabled && (
          <div
            className="absolute -inset-px opacity-30 transition-opacity duration-300"
            style={{
              background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
            }}
          />
        )}
      </div>
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
