import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void
  confirm: (title: string, message?: string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<{
    title: string
    message?: string
    resolve: (v: boolean) => void
  } | null>(null)

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = Date.now()
    setToasts(prev => [...prev, { ...opts, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, opts.duration || 3000)
  }, [])

  const confirm = useCallback((title: string, message?: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ title, message, resolve })
    })
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto"
            >
              <ToastItem toast={t} onDismiss={() => dismissToast(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmState && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="surface-elevated p-6 w-80"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-sm font-semibold mb-2">{confirmState.title}</h3>
              {confirmState.message && (
                <p className="text-xs text-[var(--muted-foreground)] mb-4">{confirmState.message}</p>
              )}
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => { confirmState.resolve(false); setConfirmState(null) }}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => { confirmState.resolve(true); setConfirmState(null) }}
                  className="px-4 py-2 text-xs font-medium bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const config = {
    success: { icon: '✓', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    error: { icon: '✕', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' },
    warning: { icon: '!', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
  }[toast.type]

  return (
    <div className={cn('w-72 rounded-lg border shadow-lg overflow-hidden', config.bg, config.border)}>
      <div className="flex items-start gap-2.5 p-3">
        <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5', config.bar)}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold', config.text)}>{toast.title}</p>
          {toast.message && <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{toast.message}</p>}
        </div>
        <button onClick={onDismiss} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs flex-shrink-0">×</button>
      </div>
    </div>
  )
}
