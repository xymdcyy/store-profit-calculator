import { type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

interface FloatingCardProps {
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function FloatingCard({
  children,
  className,
  disabled = false,
}: FloatingCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 })
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['3deg', '-3deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-3deg', '3deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--card)] transition-shadow duration-300',
        !disabled && 'hover:shadow-lg hover:shadow-[var(--primary)]/5',
        className
      )}
      style={{
        rotateX: disabled ? 0 : rotateX,
        rotateY: disabled ? 0 : rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  )
}
