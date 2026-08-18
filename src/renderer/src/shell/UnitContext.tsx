import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type MoneyUnit = 'yuan' | 'wan'

interface UnitContextValue {
  unit: MoneyUnit
  toggleUnit: () => void
  formatMoney: (n: number) => string
}

const UnitContext = createContext<UnitContextValue | null>(null)

/** 格式化金额：万元模式下除以10000，加"万"后缀 */
function fmt(n: number, unit: MoneyUnit): string {
  if (unit === 'wan') {
    return (n / 10000).toFixed(2).replace(/\.?0+$/, '') + '万'
  }
  return Math.round(n).toLocaleString()
}

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<MoneyUnit>(() => {
    try {
      const saved = localStorage.getItem('moneyUnit')
      if (saved === 'wan') return 'wan'
    } catch { /* ignore */ }
    return 'yuan'
  })

  const toggleUnit = useCallback(() => {
    setUnit(prev => {
      const next = prev === 'yuan' ? 'wan' : 'yuan'
      try { localStorage.setItem('moneyUnit', next) } catch { /* ignore */ }
      return next
    })
  }, [])

  const formatMoney = useCallback((n: number) => fmt(n, unit), [unit])

  return (
    <UnitContext.Provider value={{ unit, toggleUnit, formatMoney }}>
      {children}
    </UnitContext.Provider>
  )
}

export function useFormatMoney() {
  const ctx = useContext(UnitContext)
  if (!ctx) throw new Error('useFormatMoney must be used within UnitProvider')
  return ctx
}
