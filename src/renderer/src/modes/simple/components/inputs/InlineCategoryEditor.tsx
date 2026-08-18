import { useState, useCallback } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { sumVariableCosts, calcTierCMR } from '../../../../shared/calc/calculator'
import { getCostGroups, MODE_LABELS } from '../../data/costModeLabels'
import type { TierData, CostMode, VariableCosts } from '../../../../shared/types/scenario'
import { useFormatMoney } from '../../../../shell/UnitContext'
import NumberInput from '../../../../components/NumberInput'
import PercentInput from '../../../../components/PercentInput'

const DEFAULT_COLORS = ['#E4002B', '#B91C3C', '#f59e0b', '#10b981']

function getTierColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

interface Props {
  category: string
  data: {
    costMode: CostMode
    tierNames: [string, string, string, string]
    productStructure: Record<string, TierData>
    variableCosts: VariableCosts
  }
}

export default function InlineCategoryEditor({ category, data }: Props) {
  const { dispatch } = useScenario()
  const { formatMoney } = useFormatMoney()
  const [varOpen, setVarOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const mode = data.costMode || 'modeA'
  const groups = getCostGroups(mode)
  const tierNames = data.tierNames || ['X', 'C', 'P', 'S']
  const tiers = data.productStructure
  const vr = sumVariableCosts(data.variableCosts, data.costMode)
  const totalSales = Object.values(tiers).reduce((s, t) => s + t.sales, 0)
  const totalGP = Object.values(tiers).reduce((s, t) => s + t.sales * t.grossMargin, 0)
  const weightedGM = totalSales > 0 ? totalGP / totalSales : 0

  const startEdit = useCallback((index: number) => {
    setEditingTier(index)
    setEditValue(tierNames[index])
  }, [tierNames])

  const confirmEdit = useCallback(() => {
    if (editingTier === null) return
    const oldName = tierNames[editingTier]
    const newName = editValue.trim()
    if (newName && newName !== oldName && !tierNames.includes(newName)) {
      dispatch({ type: 'RENAME_TIER', category, oldName, newName })
    }
    setEditingTier(null)
  }, [editingTier, editValue, tierNames, category, dispatch])

  const updateTier = (tier: string, field: string, value: number) => {
    dispatch({ type: 'UPDATE_MULTI_TIER', category, tier, field, value })
  }

  const updateVR = (field: string, value: number) => {
    dispatch({ type: 'UPDATE_MULTI_VARIABLE_COST', category, field, value })
  }

  const switchMode = (newMode: CostMode) => {
    dispatch({ type: 'SWITCH_MULTI_COST_MODE', category, mode: newMode })
  }

  return (
    <div className="space-y-4">
      {/* 产品结构表格 */}
      <div>
        <h4 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">产品结构</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-[var(--text-muted)]">
              <th className="text-left py-1.5 font-medium w-20">档位</th>
              <th className="text-right py-1.5 font-medium px-2">销售额</th>
              <th className="text-right py-1.5 font-medium px-2">销量</th>
              <th className="text-right py-1.5 font-medium px-2">毛利率</th>
              <th className="text-right py-1.5 font-medium px-2">毛利额</th>
              <th className="text-right py-1.5 font-medium w-14 px-2">CMR</th>
            </tr>
          </thead>
          <tbody>
            {tierNames.map((name, idx) => {
              const t = tiers[name] || { sales: 0, volume: 0, grossMargin: 0 }
              const gp = t.sales * t.grossMargin
              const cmr = (calcTierCMR(t, vr) * 100).toFixed(1)
              const color = getTierColor(idx)
              return (
                <tr key={name} className="border-b border-[var(--border-light)]">
                  <td className="py-1.5">
                    {editingTier === idx ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={confirmEdit}
                        onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingTier(null) }}
                        className="w-16 border border-[var(--accent)] rounded px-1 py-0.5 text-[11px] font-bold focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer hover:opacity-80"
                        style={{ color }}
                        onClick={() => startEdit(idx)}
                        title="点击编辑系列名"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        {name}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-1"><NumberInput min={0} step={100} value={t.sales} onChange={v => updateTier(name, 'sales', v)} className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] tabular-nums" /></td>
                  <td className="py-1 px-1"><NumberInput min={0} step={1} integer value={t.volume} onChange={v => updateTier(name, 'volume', v)} className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] tabular-nums" /></td>
                  <td className="py-1 px-1"><div className="relative"><PercentInput value={t.grossMargin} onChange={v => updateTier(name, 'grossMargin', v)} className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] tabular-nums pr-5" /><span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-muted)]">%</span></div></td>
                  <td className="text-right text-[11px] text-[var(--text-muted)] tabular-nums px-2">{gp > 0 ? formatMoney(gp) : ''}</td>
                  <td className={`text-right text-[11px] font-semibold tabular-nums px-2 ${Number(cmr) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{cmr}%</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="text-[10px] font-semibold text-[var(--text-secondary)] border-t border-[var(--border)]">
              <td className="py-1.5">合计</td>
              <td className="text-right tabular-nums px-2">{formatMoney(totalSales)}</td>
              <td className="text-right tabular-nums px-2">{Object.values(tiers).reduce((s, t) => s + t.volume, 0)}</td>
              <td></td>
              <td className="text-right tabular-nums px-2">{totalGP > 0 ? formatMoney(totalGP) : ''}</td>
              <td></td>
            </tr>
            <tr className="text-[10px] text-[var(--text-muted)]">
              <td className="py-1">综合毛利率</td>
              <td colSpan={3}></td>
              <td className="text-right font-semibold tabular-nums text-[var(--text-primary)]">{(weightedGM * 100).toFixed(1)}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 变动费用 */}
      <div>
        <button onClick={() => setVarOpen(!varOpen)} className="flex items-center justify-between w-full text-left group">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">变动费用</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-medium">{MODE_LABELS[mode]}</span>
          </div>
          <span className="text-[10px] font-semibold text-[var(--text-primary)] tabular-nums">合计 {(vr * 100).toFixed(1)}%</span>
        </button>
        {varOpen && (
          <div className="mt-2 space-y-3">
            <div className="flex gap-0.5 bg-[var(--bg)] rounded-lg p-0.5">
              {(Object.entries(MODE_LABELS) as [CostMode, string][]).map(([key, label]) => (
                <button key={key} onClick={() => switchMode(key)} className={`flex-1 text-[10px] py-1 rounded-md font-medium transition-all ${mode === key ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)]'}`}>{label}</button>
              ))}
            </div>
            {groups.map(g => (
              <div key={g.title}>
                <div className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{g.title}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {g.items.map(item => {
                    const raw = (data.variableCosts as any)[item.key] ?? 0
                    return (
                      <div key={item.key} className="flex items-center gap-1">
                        <label className="text-[10px] text-[var(--text-muted)] w-20 truncate">{item.label}</label>
                        <PercentInput value={raw} onChange={v => updateVR(item.key, v)} className="flex-1 text-right border border-[var(--border)] rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-[var(--accent)] tabular-nums" />
                        <span className="text-[9px] text-[var(--text-muted)]">%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
