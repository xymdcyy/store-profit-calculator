import { useRef, useState, useEffect } from 'react'

/**
 * Measures a container div via ResizeObserver with feedback-loop protection.
 * Returns [ref, { width, height }] — attach `ref` to the container div.
 */
export function useContainerSize(initialWidth = 500, initialHeight = 300) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight })
  // Guard: track if we're already processing an update to prevent re-entrant loops
  const updatingRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      if (updatingRef.current) return
      const rect = el.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      if (w > 0 && h > 0) {
        updatingRef.current = true
        setSize(prev => {
          if (prev.width === w && prev.height === h) {
            updatingRef.current = false
            return prev
          }
          // Defer resetting the guard to after React commits
          Promise.resolve().then(() => { updatingRef.current = false })
          return { width: w, height: h }
        })
      }
    }

    // Initial measurement
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}
