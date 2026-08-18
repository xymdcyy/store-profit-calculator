import { useState } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { getCostGroups, MODE_LABELS, emptyVariableCosts } from '../../data/costModeLabels'
import type { CategoryData, TierData, VariableCosts, FixedCosts, CostMode } from '../../../../shared/types/scenario'
import NumberInput from '../../../../components/NumberInput'
import PercentInput from '../../../../components/PercentInput'

const ALL_CATEGORIES = ['智屏', '白电', '空调', 'CIoT']
const DEFAULT_TIER_NAMES: [string, string, string, string] = ['X', 'C', 'P', 'S']

const FIXED_ITEMS: { key: keyof FixedCosts; label: string }[] = [
  { key: 'venueFee', label: '场地费' },
  { key: 'boothCost', label: '展台' },
  { key: 'laborCost', label: '人力成本' },
  { key: 'dailyExpense', label: '日常费用' },
  { key: 'operationSupport', label: '运营支持' },
]

function emptyProductStructure(tierNames: [string, string, string, string] = DEFAULT_TIER_NAMES): Record<string, TierData> {
  return Object.fromEntries(tierNames.map(k => [k, { sales: 0, volume: 0, grossMargin: 0 }]))
}

interface Props {
  onComplete: (data: { categories: Record<string, CategoryData>; storeFC: FixedCosts }) => void
  onClose: () => void
}

export default function CategoryWizard({ onComplete, onClose }: Props) {
  const { state } = useScenario()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>(['智屏'])
  const [activeTab, setActiveTab] = useState(0)
  const [costMode, setCostMode] = useState<CostMode>('modeA')

  const [categories, setCategories] = useState<Record<string, CategoryData>>({})
  const [storeFC, setStoreFC] = useState<FixedCosts>(state.scenario.storeFixedCosts)

  const toggleCategory = (cat: string) => {
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const goStep2 = () => {
    if (selected.length === 0) return
    const init: Record<string, CategoryData> = {}
    for (const cat of selected) {
      init[cat] = {
        category: cat,
        costMode,
        tierNames: DEFAULT_TIER_NAMES,
        productStructure: emptyProductStructure(),
        variableCosts: emptyVariableCosts(),
      }
    }
    setCategories(init)
    setActiveTab(0)
    setStep(2)
  }

  const switchCostMode = (mode: CostMode) => {
    setCostMode(mode)
    // 只切换核算模式，不覆盖已填数据（费率按模式过滤计算，两套费用池互不干扰）
    setCategories(prev => {
      const next: Record<string, CategoryData> = {}
      for (const [key, cat] of Object.entries(prev)) {
        next[key] = { ...cat, costMode: mode }
      }
      return next
    })
  }

  const updateTier = (catKey: string, tier: string, field: string, value: number) => {
    setCategories(prev => {
      const c = { ...prev[catKey] }
      c.productStructure = { ...c.productStructure, [tier]: { ...c.productStructure[tier], [field]: value } }
      return { ...prev, [catKey]: c }
    })
  }

  const updateVR = (catKey: string, field: string, value: number) => {
    setCategories(prev => {
      const c = { ...prev[catKey] }
      c.variableCosts = { ...c.variableCosts, [field]: value }
      return { ...prev, [catKey]: c }
    })
  }

  const updateFC = (field: keyof FixedCosts, value: number) => {
    setStoreFC(prev => ({ ...prev, [field]: value }))
  }

  const handleFinish = () => {
    onComplete({ categories, storeFC })
  }

  const groups = getCostGroups(costMode)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div className="surface-elevated w-[800px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-light)] sticky top-0 bg-white z-10 rounded-t-[var(--radius-lg)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">多品类综合测算</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-all btn-press">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-light)]">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                step >= s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
              }`}>{s}</div>
              <span className={`text-[11px] font-medium ${step >= s ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {s === 1 ? '选择品类' : s === 2 ? '填写数据' : '固定费用'}
              </span>
              {s < 3 && <div className={`w-6 h-0.5 ${step > s ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
        </div>

        <div className="p-5">
          {step === 1 && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-4">请选择要测算的品类（可多选）</p>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {ALL_CATEGORIES.map(cat => {
                  const isSel = selected.includes(cat)
                  return (
                    <button key={cat} onClick={() => toggleCategory(cat)}
                      className={`py-5 rounded-xl border-2 text-center font-bold text-sm transition-all btn-press ${
                        isSel ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                              : 'border-[var(--border-light)] bg-white text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]'
                      }`}>{cat}</button>
                  )
                })}
              </div>
              <div className="flex justify-end">
                <button onClick={goStep2} disabled={selected.length === 0}
                  className="px-5 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all btn-press">
                  下一步：填写数据
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex gap-1 mb-4 border-b border-[var(--border-light)]">
                {selected.map((cat, i) => (
                  <button key={cat} onClick={() => setActiveTab(i)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                      activeTab === i ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}>{cat}</button>
                ))}
              </div>

              <div className="flex gap-0.5 bg-[var(--bg)] rounded-lg p-0.5 mb-4">
                {(Object.entries(MODE_LABELS) as [CostMode, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => switchCostMode(key)}
                    className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-all btn-press ${
                      costMode === key ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}>{label}</button>
                ))}
              </div>

              {selected.map((cat, i) => {
                if (i !== activeTab) return null
                const data = categories[cat]
                if (!data) return null
                const tiers = data.productStructure
                const totalSales = Object.values(tiers).reduce((s, t) => s + t.sales, 0)
                const totalGP = Object.values(tiers).reduce((s, t) => s + t.sales * t.grossMargin, 0)
                const weightedGM = totalSales > 0 ? totalGP / totalSales : 0

                return (
                  <div key={cat} className="space-y-3">
                    <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">产品结构</h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-light)] text-[10px] text-[var(--text-muted)]">
                          <th className="text-left py-1 font-medium w-8">档位</th>
                          <th className="text-right py-1 font-medium">销售额</th>
                          <th className="text-right py-1 font-medium">销量</th>
                          <th className="text-right py-1 font-medium">毛利率</th>
                          <th className="text-right py-1 font-medium">毛利额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(categories[cat]?.tierNames || DEFAULT_TIER_NAMES).map(tier => {
                          const t = tiers[tier]
                          const gp = t.sales * t.grossMargin
                          return (
                            <tr key={tier} className="border-b border-[var(--border-light)]">
                              <td className="py-1 font-bold text-[11px] text-[var(--accent)]">{tier}</td>
                              <td className="py-0.5 px-0.5">
                                <NumberInput min={0} step={100} value={t.sales}
                                  onChange={v => updateTier(cat, tier, 'sales', v)}
                                  className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] transition-all tabular-nums" />
                              </td>
                              <td className="py-0.5 px-0.5">
                                <NumberInput min={0} step={1} integer value={t.volume}
                                  onChange={v => updateTier(cat, tier, 'volume', v)}
                                  className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] transition-all tabular-nums" />
                              </td>
                              <td className="py-0.5 px-0.5">
                                <div className="relative">
                                  <PercentInput value={t.grossMargin} onChange={v => updateTier(cat, tier, 'grossMargin', v)}
                                    className="w-full text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] transition-all tabular-nums pr-5" />
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">%</span>
                                </div>
                              </td>
                              <td className="text-right text-[11px] text-[var(--text-muted)] tabular-nums px-0.5">{gp > 0 ? Math.round(gp).toLocaleString() : ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold text-[11px] text-[var(--text-secondary)] border-t border-[var(--border)]">
                          <td className="py-1.5">合计</td>
                          <td className="text-right tabular-nums">{totalSales.toLocaleString()}</td>
                          <td className="text-right tabular-nums">{Object.values(tiers).reduce((s, t) => s + t.volume, 0)}</td>
                          <td></td>
                          <td className="text-right tabular-nums">{totalGP > 0 ? Math.round(totalGP).toLocaleString() : ''}</td>
                        </tr>
                        <tr className="text-[10px] text-[var(--text-muted)]">
                          <td className="py-0.5">综合毛利率</td>
                          <td colSpan={3}></td>
                          <td className="text-right font-semibold tabular-nums text-[var(--text-primary)]">{(weightedGM * 100).toFixed(1)}%</td>
                        </tr>
                      </tfoot>
                    </table>

                    <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mt-4">变动费用</h4>
                    {groups.map(g => (
                      <div key={g.title}>
                        <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">{g.title}</div>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                          {g.items.map(item => {
                            const val = (data.variableCosts as any)[item.key] ?? 0
                            return (
                              <div key={item.key} className="flex items-center gap-1.5">
                                <label className="text-[11px] text-[var(--text-muted)] w-28 truncate">{item.label}</label>
                                <PercentInput value={val}
                                  onChange={v => updateVR(cat, item.key, v)}
                                  className="flex-1 text-right border border-[var(--border)] rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-[var(--accent)] transition-all tabular-nums" />
                                <span className="text-[10px] text-[var(--text-muted)]">%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="px-4 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] transition-all btn-press text-[var(--text-secondary)]">上一步</button>
                <button onClick={() => setStep(3)} className="px-5 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent-hover)] transition-all btn-press">下一步：固定费用</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">门店共同固定费用（元/月）</h4>
              <div className="space-y-2.5 max-w-md">
                {FIXED_ITEMS.map(item => (
                  <div key={item.key} className="flex items-center gap-3">
                    <label className="text-xs text-[var(--text-secondary)] w-20">{item.label}</label>
                    <NumberInput min={0} step={100} value={storeFC[item.key]}
                      onChange={v => updateFC(item.key, v)}
                      className="flex-1 text-right border border-[var(--border)] rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] transition-all tabular-nums" />
                    <span className="text-[11px] text-[var(--text-muted)]">元</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-3">
                已选品类：{selected.join('、')} · {MODE_LABELS[costMode]}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="px-4 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] transition-all btn-press text-[var(--text-secondary)]">上一步</button>
                <button onClick={handleFinish} className="px-5 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent-hover)] transition-all btn-press">完成测算</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
