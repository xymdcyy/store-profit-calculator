import { createContext, useContext, useState, type ReactNode } from 'react'

export type AppMode = 'simple' | 'professional'

interface ModeContextValue {
  mode: AppMode
  setMode: (mode: AppMode) => void
  toggleMode: () => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: ReactNode }) {
  // 每次启动默认 'simple'，不持久化上次选择
  const [mode, setModeState] = useState<AppMode>('simple')

  const setMode = (m: AppMode) => {
    setModeState(m)
  }

  const toggleMode = () => {
    setModeState(prev => prev === 'simple' ? 'professional' : 'simple')
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
