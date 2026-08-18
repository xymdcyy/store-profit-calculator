import { useState, useCallback } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import type { TierData } from '../../../../shared/types/scenario'
import { sumVariableCosts, calcTierCMR } from '../../../../shared/calc/calculator'
import NumberInput from '../../../../components/NumberInput'
import PercentInput from '../../../../components/PercentInput'

function fmt(n: number): string { return Math.round(n).toLocaleString() }

const DEFAULT_COLORS = ['#E4002B', '#B91C3C', '#f59e0b', '#10b981']

function getTierColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export default function TierInput() {
  const { state, dispatch } = useScenario()
  const cat = state.scenario.singleCategory?.data
  if (!cat) return null

  const tierNames = cat.tierNames || ['X', 'C', 'P', 'S']
  const tiers = cat.productStructure
  const vr = sumVariableCosts(cat.variableCosts, cat.costMode)
  const totalSales = Object.values(tiers).reduce((s, t) => s + t.sales, 0)
  const totalGP = Object.values(tiers).reduce((s, t) => s + t.sales * t.grossMargin, 0)
  const totalSubsidy = Object.values(tiers).reduce((s, t) => s + (t.subsidy || 0), 0)
  const weightedGM = totalSales > 0 ? totalGP / totalSales : 0

  const [editingTier, setEditingTier] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = useCallback((index: number) => {
    setEditingTier(index)
    setEditValue(tierNames[index])
  }, [tierNames])

  const confirmEdit = useCallback(() => {
    if (editingTier === null) return
    const oldName = tierNames[editingTier]
    const newName = editValue.trim()
    if (newName && newName !== oldName && !tierNames.includes(newName)) {
      dispatch({ type: 'RENAME_TIER', category: '', oldName, newName })
    }
    setEditingTier(null)
  }, [editingTier, editValue, tierNames, dispatch])

  const update = (tier: string, field: string, value: number) => {
    dispatch({ type: 'UPDATE_TIER', tier, field, value })
  }

  return (
    <div className="surface p-3 mb-3">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">产品结构</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[11px] text-[var(--text-muted)]">
            <th className="text-left py-1.5 font-medium w-16">档位</th>
            <th className="text-right py-1.5 font-medium px-2">销售额</th>
            <th className="text-right py-1.5 font-medium px-2">销量</th>
            <th className="text-right py-1.5 font-medium px-2">毛利率</th>
            <th className="text-right py-1.5 font-medium px-2">毛利额</th>
            <th className="text-right py-1.5 font-medium w-12 px-2">占比</th>
            <th className="text-right py-1.5 font-medium w-14 px-2">CMR</th>
            <th className="text-right py-1.5 font-medium px-2">补贴</th>
          </tr>
        </thead>
        <tbody>
          {tierNames.map((name, idx) => {
            const t = tiers[name] || { sales: 0, volume: 0, grossMargin: 0, subsidy: 0 } as TierData
            const gp = t.sales * t.grossMargin
            const ratio = totalSales > 0 ? (t.sales / totalSales * 100).toFixed(1) : '0'
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
                      className="w-14 border border-[var(--accent)] rounded px-1 py-0.5 text-[11px] font-bold focus:outline-none"
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
                <td className="py-1 px-2">
                  <NumberInput min={0} step={100} value={t.sales}
                    onChange={v => update(name, 'sales', v)}
                    className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)] transition-all tabular-nums" />
                </td>
                <td className="py-1 px-2">
                  <NumberInput min={0} step={1} integer value={t.volume}
                    onChange={v => update(name, 'volume', v)}
                    className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)] transition-all tabular-nums" />
                </td>
                <td className="py-1 px-2">
                  <div className="relative">
                    <PercentInput value={t.grossMargin} onChange={v => update(name, 'grossMargin', v)}
                      className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)] transition-all tabular-nums pr-5" />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">%</span>
                  </div>
                </td>
                <td className="text-right text-[11px] text-[var(--text-muted)] tabular-nums px-2">{gp > 0 ? fmt(gp) : ''}</td>
                <td className="text-right text-[11px] text-[var(--text-muted)] tabular-nums px-2">{ratio}%</td>
                <td className={`text-right text-[11px] font-semibold tabular-nums px-2 ${Number(cmr) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {cmr}%
                </td>
                <td className="py-1 px-2">
                  <NumberInput min={0} step={100} value={t.subsidy}
                    onChange={v => update(name, 'subsidy', v)}
                    className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)] transition-all tabular-nums" />
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="text-[11px] font-semibold text-[var(--text-secondary)] border-t border-[var(--border)]">
            <td className="py-1.5">合计</td>
            <td className="text-right tabular-nums px-2">{fmt(totalSales)}</td>
            <td className="text-right tabular-nums px-2">{Object.values(tiers).reduce((s, t) => s + t.volume, 0)}</td>
            <td></td>
            <td className="text-right tabular-nums px-2">{totalGP > 0 ? fmt(totalGP) : ''}</td>
            <td className="text-right tabular-nums px-2">100%</td>
            <td></td>
            <td className="text-right tabular-nums px-2">{totalSubsidy > 0 ? fmt(totalSubsidy) : ''}</td>
          </tr>
          <tr className="text-[11px] text-[var(--text-muted)]">
            <td className="py-1 whitespace-nowrap">综合毛利率</td>
            <td colSpan={4}></td>
            <td className="text-right font-semibold tabular-nums text-[var(--text-primary)]">{(weightedGM * 100).toFixed(1)}%</td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
