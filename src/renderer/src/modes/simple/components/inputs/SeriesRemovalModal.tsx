import { useState, useMemo } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { calcSingleStore, calcCMR, sumVariableCosts } from '../../../../shared/calc/calculator'
import type { StoreResult, CategoryData, FixedCosts } from '../../../../shared/types/scenario'

type TransferMode = 'lost' | 'distribute' | 'custom'

function fmt(n: number): string {
  return Math.round(n).toLocaleString()
}

export default function SeriesRemovalModal({ onClose }: { onClose: () => void }) {
  const { state } = useScenario()
  const cat = state.scenario.singleCategory?.data
  const fc = state.scenario.storeFixedCosts
  if (!cat || !fc) return null

  const tierNames = Object.keys(cat.productStructure)
  const [selectedTier, setSelectedTier] = useState<string>(tierNames[0])
  const [mode, setMode] = useState<TransferMode>('lost')
  const [customValues, setCustomValues] = useState<Record<string, number>>({})

  const currentResult = useMemo(() => {
    return calcSingleStore(state.scenario.storeName, cat, fc)
  }, [cat, fc, state.scenario.storeName])

  const simulatedResult = useMemo<StoreResult | null>(() => {
    const removed = cat.productStructure[selectedTier]
    if (!removed || removed.sales <= 0) return null

    const newTiers = { ...cat.productStructure }
    const removedSales = removed.sales

    if (mode === 'lost') {
      delete newTiers[selectedTier]
    } else if (mode === 'distribute') {
      const vr = sumVariableCosts(cat.variableCosts, cat.costMode)
      const otherTiers = tierNames.filter(t => t !== selectedTier)
      const tiersWithCMR = otherTiers.map(t => ({
        name: t,
        cmr: Math.max(0, calcCMR(cat.productStructure[t].grossMargin, vr)),
      }))
      const totalCMR = tiersWithCMR.reduce((s, t) => s + t.cmr, 0)
      delete newTiers[selectedTier]
      for (const { name, cmr } of tiersWithCMR) {
        const share = totalCMR > 0 ? cmr / totalCMR : 1 / otherTiers.length
        newTiers[name] = {
          ...newTiers[name],
          sales: newTiers[name].sales + removedSales * share,
        }
      }
    } else {
      delete newTiers[selectedTier]
      for (const t of tierNames) {
        if (t === selectedTier) continue
        const extra = customValues[t] || 0
        newTiers[t] = {
          ...newTiers[t],
          sales: newTiers[t].sales + extra,
        }
      }
    }

    const newCat: CategoryData = { ...cat, productStructure: newTiers }
    return calcSingleStore(state.scenario.storeName, newCat, fc)
  }, [cat, fc, selectedTier, mode, customValues, state.scenario.storeName, tierNames])

  const totalRemoved = cat.productStructure[selectedTier]?.sales || 0

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-16" onClick={onClose}>
      <div className="surface-elevated w-[560px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">结构调整模拟：砍掉系列</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-all btn-press">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block font-medium">选择要移除的系列：</label>
            <div className="flex gap-2">
              {tierNames.map(t => (
                <button key={t} onClick={() => setSelectedTier(t)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all btn-press ${
                    selectedTier === t ? 'bg-red-500 text-white shadow-sm' : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-light)]'
                  }`}
                >
                  {t}（¥{fmt(cat.productStructure[t]?.sales || 0)}）
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-2 block font-medium">
              砍掉 <span className="font-semibold text-red-500">{selectedTier}</span> 后，¥{fmt(totalRemoved)} 销售额的处理方式：
            </label>
            <div className="space-y-2">
              {[
                { key: 'lost' as const, label: '全部流失（总销售额减少）', desc: '该系列销售额完全消失' },
                { key: 'distribute' as const, label: '转移至其他系列（按 CMR 比例分配）', desc: '高边际贡献率系列承接更多销售额' },
                { key: 'custom' as const, label: '自定义分配', desc: '手动指定各系列承接金额' },
              ].map(opt => (
                <label key={opt.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  mode === opt.key ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-light)] hover:border-[var(--border)]'
                }`}>
                  <input type="radio" name="transferMode" checked={mode === opt.key} onChange={() => setMode(opt.key)} className="mt-0.5 accent-[var(--accent)]" />
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">{opt.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {mode === 'custom' && (
            <div className="bg-[var(--bg)] rounded-lg p-3">
              <div className="text-[11px] text-[var(--text-muted)] mb-2">指定各系列承接的销售额（合计需等于 ¥{fmt(totalRemoved)}）</div>
              <div className="space-y-1.5">
                {tierNames.filter(t => t !== selectedTier).map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)] w-8 font-medium">{t}</span>
                    <input type="number" min={0} step={1000} value={customValues[t] || ''}
                      onChange={e => setCustomValues(prev => ({ ...prev, [t]: parseFloat(e.target.value) || 0 }))}
                      className="flex-1 border border-[var(--border)] rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[var(--accent)] transition-all tabular-nums" />
                    <span className="text-[11px] text-[var(--text-muted)]">元</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {simulatedResult && (
            <div className="border-t border-[var(--border-light)] pt-3">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">模拟结果对比</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[var(--bg)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">当前</div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">销售额</span><span className="font-semibold tabular-nums">¥{fmt(currentResult.totalSales)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">利润</span><span className={`font-semibold tabular-nums ${currentResult.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{fmt(currentResult.profit)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">保本点</span><span className="font-semibold tabular-nums">¥{fmt(currentResult.breakevenSales ?? 0)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">安全边际</span><span className="font-semibold tabular-nums">{(currentResult.safetyMarginRate !== null ? (currentResult.safetyMarginRate * 100).toFixed(1) : '--')}%</span></div>
                  </div>
                </div>
                <div className="bg-[var(--accent-soft)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--accent)] uppercase tracking-wider mb-1.5">砍掉 {selectedTier}</div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">销售额</span><span className="font-semibold tabular-nums">¥{fmt(simulatedResult.totalSales)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">利润</span><span className={`font-semibold tabular-nums ${simulatedResult.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{fmt(simulatedResult.profit)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">保本点</span><span className="font-semibold tabular-nums">¥{fmt(simulatedResult.breakevenSales ?? 0)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">安全边际</span><span className="font-semibold tabular-nums">{(simulatedResult.safetyMarginRate !== null ? (simulatedResult.safetyMarginRate * 100).toFixed(1) : '--')}%</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                BEP 变化：
                {simulatedResult.breakevenSales && currentResult.breakevenSales
                  ? (simulatedResult.breakevenSales > currentResult.breakevenSales
                    ? <span className="text-red-500 font-medium">右移 ¥{fmt(simulatedResult.breakevenSales - currentResult.breakevenSales)}（保本更难）</span>
                    : <span className="text-emerald-600 font-medium">左移 ¥{fmt(currentResult.breakevenSales - simulatedResult.breakevenSales)}（保本更容易）</span>)
                  : '--'}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg)] rounded-b-[var(--radius-lg)]">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-white transition-all btn-press text-[var(--text-secondary)]">关闭</button>
        </div>
      </div>
    </div>
  )
}
