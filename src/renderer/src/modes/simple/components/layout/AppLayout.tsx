import { useState, type ReactNode } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { useFormatMoney } from '../../../../shell/UnitContext'

interface Props {
  title: string
  actions?: ReactNode
  tabs?: ReactNode
  children: ReactNode
}

export default function AppLayout({ title, actions, tabs, children }: Props) {
  const { state, dispatch } = useScenario()
  const { unit, toggleUnit } = useFormatMoney()
  const [editingPeriod, setEditingPeriod] = useState(false)
  const [periodDraft, setPeriodDraft] = useState('')

  const periodLabel = state.scenario.periodLabel || ''

  const startEditPeriod = () => {
    setPeriodDraft(periodLabel)
    setEditingPeriod(true)
  }

  const savePeriod = () => {
    dispatch({ type: 'UPDATE_PERIOD', period: periodDraft })
    setEditingPeriod(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border-light)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 5-6" />
              </svg>
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
            {/* 门店名称 */}
            <span className="text-[11px] text-[var(--text-muted)]">{state.scenario.storeName || '未命名门店'}</span>
            {/* 期间标签 */}
            {editingPeriod ? (
              <input
                autoFocus
                value={periodDraft}
                onChange={e => setPeriodDraft(e.target.value)}
                onBlur={savePeriod}
                onKeyDown={e => { if (e.key === 'Enter') savePeriod(); if (e.key === 'Escape') setEditingPeriod(false) }}
                placeholder="如：2026年1月至6月"
                className="text-[11px] border border-[var(--accent)] rounded px-2 py-0.5 bg-white focus:outline-none w-36"
              />
            ) : (
              <button
                onClick={startEditPeriod}
                className={`text-[11px] px-2 py-0.5 rounded border border-transparent hover:border-[var(--border)] transition-colors ${periodLabel ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] italic'}`}
              >
                {periodLabel || '+ 添加期间'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* 万元切换 */}
            <button
              onClick={toggleUnit}
              className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press"
              title={unit === 'yuan' ? '切换为万元显示' : '切换为元显示'}
            >
              {unit === 'yuan' ? '¥ 元' : '¥ 万元'}
            </button>
            {actions}
          </div>
        </div>
        {tabs && (
          <nav className="max-w-7xl mx-auto px-5 flex border-t border-[var(--border-light)]">
            {tabs}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-5 py-5">
        {children}
      </main>
    </div>
  )
}
