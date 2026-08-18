import { useScenario } from '../../../../shared/context/ScenarioContext'
import { useFormatMoney } from '../../../../shell/UnitContext'
import NumberInput from '../../../../components/NumberInput'
const ITEMS: { key: string; label: string }[] = [
  { key: 'venueFee', label: '场地费' },
  { key: 'boothCost', label: '展台' },
  { key: 'laborCost', label: '人力成本' },
  { key: 'dailyExpense', label: '日常费用' },
  { key: 'operationSupport', label: '运营支持' },
]

export default function FixedCostInput() {
  const { state, dispatch } = useScenario()
  const { formatMoney } = useFormatMoney()
  const fc = state.scenario.storeFixedCosts
  const total = Object.values(fc).reduce((a, b) => a + b, 0)
  const totalSales = state.result?.totalSales ?? 0
  const fcRatio = totalSales > 0 ? total / totalSales : 0

  const update = (field: string, value: number) => {
    dispatch({ type: 'UPDATE_FIXED_COST', field, value: Math.max(0, value) })
  }

  const step = (field: string, delta: number) => {
    const cur = fc[field as keyof typeof fc] ?? 0
    const newVal = Math.max(0, Math.round(cur + delta))
    if (newVal !== cur) update(field, newVal)
  }

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[var(--primary)]" />
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">固定费用</h3>
        </div>
        <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
          合计 {(fcRatio * 100).toFixed(1)}%
        </span>
      </div>
      <div className="space-y-1.5">
        {ITEMS.map(item => {
          const val = fc[item.key as keyof typeof fc] ?? 0
          return (
            <div key={item.key} className="flex items-center gap-2 group/item hover:bg-[var(--muted)]/40 rounded-md px-1 py-0.5 transition-colors">
              <label className="text-xs text-[var(--text-secondary)] w-14 flex-shrink-0">{item.label}</label>
              <div className="flex items-center flex-1 gap-0.5">
                <button
                  onClick={() => step(item.key, -100)}
                  className="w-7 h-7 rounded-md bg-[var(--muted)] hover:bg-[var(--secondary)] text-[var(--text-secondary)] text-xs font-medium transition-colors flex items-center justify-center opacity-0 group-hover/item:opacity-100"
                >
                  −
                </button>
                <div className="relative flex-1">
                  <NumberInput
                    min={0} step={100}
                    value={val}
                    onChange={v => update(item.key, v)}
                    className="w-full text-right border border-[var(--border)] rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--secondary)] transition-all tabular-nums pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)]">元</span>
                </div>
                <button
                  onClick={() => step(item.key, 100)}
                  className="w-7 h-7 rounded-md bg-[var(--muted)] hover:bg-[var(--secondary)] text-[var(--text-secondary)] text-xs font-medium transition-colors flex items-center justify-center opacity-0 group-hover/item:opacity-100"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
        <div className="flex items-center gap-2 pt-2 mt-1 border-t border-[var(--border)]">
          <span className="text-xs font-semibold text-[var(--primary)] w-14 flex-shrink-0">合计</span>
          <span className="flex-1 text-right text-sm font-bold text-[var(--primary)] tabular-nums pr-2">
            ¥{formatMoney(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
