import { useState } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { sumVariableCosts } from '../../../../shared/calc/calculator'
import { getCostGroups, MODE_LABELS } from '../../data/costModeLabels'
import type { CostMode, InputMode } from '../../../../shared/types/scenario'
import NumberInput from '../../../../components/NumberInput'
import PercentInput from '../../../../components/PercentInput'

interface Props {
  /** 为财务专业版提供金额/点位切换。不传则默认点位模式 */
  displayMode?: InputMode
  totalSales?: number
}

export default function VariableCostInput({ displayMode = 'rate', totalSales = 0 }: Props) {
  const [open, setOpen] = useState(true)
  const { state, dispatch } = useScenario()
  const cat = state.scenario.singleCategory?.data
  if (!cat) return null

  const mode = cat.costMode || 'modeA'
  const total = sumVariableCosts(cat.variableCosts, cat.costMode)
  const groups = getCostGroups(mode)
  const sales = totalSales > 0 ? totalSales : 1 // 兜底避免除零
  const isAmount = displayMode === 'amount'

  const update = (field: string, value: number) => {
    dispatch({ type: 'UPDATE_VARIABLE_COST', field, value })
  }

  const switchMode = (newMode: CostMode) => {
    dispatch({ type: 'SWITCH_COST_MODE', mode: newMode })
  }

  /** 金额模式下将费率转为金额显示 */
  const toDisplay = (rate: number) => isAmount ? Math.round(rate * sales) : parseFloat((rate * 100).toFixed(10))
  /** 金额模式下将输入的金额转回费率 */
  const fromInput = (val: number) => isAmount ? val / sales : val / 100

  return (
    <div className="surface p-4 mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">变动费用</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-medium">
            {MODE_LABELS[mode]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
            {isAmount ? `¥${Math.round(total * totalSales).toLocaleString()}` : `合计 ${(total * 100).toFixed(1)}%`}
          </span>
          <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {/* Mode switcher */}
          <div className="flex gap-0.5 bg-[var(--bg)] rounded-lg p-0.5">
            {(Object.entries(MODE_LABELS) as [CostMode, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => switchMode(key)}
                className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all btn-press ${
                  mode === key
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cost item groups */}
          {groups.map(g => (
            <div key={g.title}>
              <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 pl-0.5">
                {g.title}
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                {g.items.map(item => {
                  const raw = (cat.variableCosts as any)[item.key] ?? 0
                  const displayVal = toDisplay(raw)
                  const isActive = raw > 0
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <label className={`text-[11px] w-28 flex-shrink-0 truncate leading-tight ${isActive ? 'text-[var(--text-secondary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                        {item.label}
                      </label>
                      <div className="relative flex-1 min-w-[72px]">
                        {isAmount ? (
                          <NumberInput
                            min={0} step={100}
                            value={displayVal || undefined}
                            onChange={v => update(item.key, fromInput(v))}
                            className={`w-full text-right border rounded-md px-2 py-1.5 text-xs tabular-nums transition-all focus:outline-none focus:ring-1 ${
                              isActive
                                ? 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-soft)]'
                                : 'border-[var(--border-light)] focus:border-[var(--border)]'
                            } pr-7`}
                          />
                        ) : (
                          <PercentInput
                            value={raw === 0 ? null : raw}
                            onChange={v => update(item.key, v)}
                            className={`w-full text-right border rounded-md px-2 py-1.5 text-xs tabular-nums transition-all focus:outline-none focus:ring-1 ${
                              isActive
                                ? 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-soft)]'
                                : 'border-[var(--border-light)] focus:border-[var(--border)]'
                            } pr-7`}
                          />
                        )}
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)]">
                          {isAmount ? '元' : '%'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
