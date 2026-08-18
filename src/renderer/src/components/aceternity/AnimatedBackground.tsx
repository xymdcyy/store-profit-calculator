import { useEffect, useRef } from 'react'

interface AnimatedBackgroundProps {
  className?: string
  color?: string
  density?: number
}

export function AnimatedBackground({
  className = '',
  color = 'rgba(228, 0, 43, 0.03)',
  density = 30,
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
    }> = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const initParticles = () => {
      particles = Array.from({ length: density }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${p.opacity})`)
        ctx.fill()
      })

      animationId = requestAnimationFrame(draw)
    }

    resize()
    initParticles()
    draw()

    window.addEventListener('resize', () => {
      resize()
      initParticles()
    })

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [color, density])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
