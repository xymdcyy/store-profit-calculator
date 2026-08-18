import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useMode } from '../../../shell/ModeContext'
import { useFormatMoney } from '../../../shell/UnitContext'
import { useScenario } from '../../../shared/context/ScenarioContext'
import HelpModal from '../../simple/components/common/HelpModal'

const NAV_ITEMS = [
  { path: '/', label: '测算输入', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { path: '/result', label: '结果展示', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/chart', label: '图表可视化', icon: 'M3 3v18h18M7 16l4-4 4 4 5-6' },
  { path: '/sensitivity', label: '敏感性分析', icon: 'M4 4v5h5M20 20v-5h-5M4 20l16-16M20 4L4 20' },
  { path: '/trend', label: '趋势分析', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { path: '/history', label: '历史记录', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/compare', label: '方案对比', icon: 'M8 7h8m-8 5h8m-8 5h8M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2z' },
]

export default function ProLayout({ children }: { children: ReactNode }) {
  const { toggleMode } = useMode()
  const { unit, toggleUnit } = useFormatMoney()
  const { state, dispatch } = useScenario()
  const [editingPeriod, setEditingPeriod] = useState(false)
  const [periodDraft, setPeriodDraft] = useState('')
  const [showHelp, setShowHelp] = useState(false)

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
    <div className="flex h-screen bg-[var(--background)]">
      <aside className="w-[260px] bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col py-6 px-3 gap-2">
        <div className="flex items-center gap-3 px-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 5-6" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--foreground)]">TCL门店盈利测算</h1>
            <p className="text-[10px] text-[var(--muted-foreground)]">财务专业模式</p>
          </div>
        </div>

        {/* 门店 & 期间 */}
        <div className="px-3 mb-2 space-y-1">
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {state.scenario.storeName || '未命名门店'}
          </p>
          {editingPeriod ? (
            <input autoFocus value={periodDraft} onChange={e => setPeriodDraft(e.target.value)}
              onBlur={savePeriod} onKeyDown={e => { if (e.key === 'Enter') savePeriod(); if (e.key === 'Escape') setEditingPeriod(false) }}
              placeholder="如：2026年1月至6月"
              className="text-[10px] border border-[var(--primary)] rounded px-1.5 py-0.5 bg-white focus:outline-none w-full" />
          ) : (
            <button onClick={startEditPeriod}
              className={`text-[10px] px-1.5 py-0.5 rounded border border-transparent hover:border-[var(--sidebar-border)] transition-colors block w-full text-left ${periodLabel ? 'text-[var(--sidebar-foreground)]' : 'text-[var(--muted-foreground)] italic'}`}>
              {periodLabel || '+ 添加期间'}
            </button>
          )}
        </div>

        {/* 万元切换 */}
        <div className="px-3 mb-1">
          <button onClick={toggleUnit}
            className="w-full text-[10px] font-medium border border-[var(--sidebar-border)] rounded-lg px-2 py-1 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
            单位：{unit === 'yuan' ? '元' : '万元'}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                  isActive ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <button onClick={() => setShowHelp(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius)] text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--accent-hover)] transition-colors">
            使用帮助
          </button>
          <button onClick={toggleMode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius)] text-xs font-medium border border-[var(--sidebar-border)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
            切换门店简洁模式
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
