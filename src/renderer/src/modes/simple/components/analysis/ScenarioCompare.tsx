import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { fetchScenarios, fetchScenario, deleteScenario, updateScenario } from '../../services/api'
import { useToast } from '../../../../components/ui/toast'
import { calcSingleStore, calcMultiCategory, buildStepChartData } from '../../../../shared/calc/calculator'
import type { StoreResult, CalculationScenario } from '../../../../shared/types/scenario'

interface ScenarioRow {
  id: string
  name: string
  result: StoreResult | null
  scenario?: CalculationScenario
}

interface Props {
  currentResult: StoreResult | null
  currentScenario?: CalculationScenario
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--'
  return Math.round(n).toLocaleString()
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--'
  return (n * 100).toFixed(1) + '%'
}

interface MetricDef {
  key: string
  label: string
  category: 'result' | 'product' | 'variable' | 'fixed'
  format: (r: StoreResult, s?: CalculationScenario) => string
}

/** 变动费用标签映射 */
const VC_LABELS: Record<string, string> = {
  commission: '开单扣', annualRebate: '年度返利', retailDiscount: '零售折扣',
  salesCommission: '销代提成', businessCommission: '业务提成', extraIncentive: '追加激励',
  logisticsFee: '储运费', contractRebate: '合同内返利', channelIncentiveOnline: '渠道激励(线上)',
  commissionSales: '佣金-销代', commissionBusiness: '佣金-业务', retailIncentive: '储运物流',
  extraRebate: '合同外返利', promotionSupport: '促销活动支持',
  channelIncentivePrivate: '渠道激励(对私)', channelIncentiveReferral: '渠道激励(带单)',
  promotionFee: '促销推广费', salesGap: '销售补差',
}

/** 固定费用标签映射 */
const FC_LABELS: Record<string, string> = {
  venueFee: '场地费', boothCost: '展台', laborCost: '人力成本',
  dailyExpense: '日常费用', operationSupport: '运营支持',
}

/** 从 scenario 中取变动费用值 */
function getVC(s: CalculationScenario | undefined, key: string): number {
  return (s?.singleCategory?.data?.variableCosts as any)?.[key] ?? 0
}
/** 从 scenario 中取固定费用值 */
function getFC(s: CalculationScenario | undefined, key: string): number {
  return (s?.storeFixedCosts as any)?.[key] ?? 0
}

function buildAllMetrics(tierNames: string[]): MetricDef[] {
  return [
    ...tierNames.flatMap<MetricDef>(tier => [
      { key: `${tier}_sales`, label: `${tier}-销售额`, category: 'product' as const, format: (r: StoreResult) => {
        const cr = Object.values(r.categoryResults)[0]
        return cr ? '¥' + fmt(cr.tierResults[tier]?.sales) : '--'
      }},
      { key: `${tier}_volume`, label: `${tier}-销量`, category: 'product', format: (r: StoreResult) => {
        const cr = Object.values(r.categoryResults)[0]
        return cr ? fmt(cr.tierResults[tier]?.volume) : '--'
      }},
      { key: `${tier}_gm`, label: `${tier}-毛利率`, category: 'product', format: (r: StoreResult) => {
        const cr = Object.values(r.categoryResults)[0]
        return cr ? pct(cr.tierResults[tier]?.grossMargin) : '--'
      }},
      { key: `${tier}_cmr`, label: `${tier}-CMR`, category: 'product', format: (r: StoreResult) => {
        const cr = Object.values(r.categoryResults)[0]
        return cr ? pct(cr.tierResults[tier]?.cmr) : '--'
      }},
    ]),
    { key: 'totalSales', label: '合计销售额', category: 'product', format: r => '¥' + fmt(r.totalSales) },
  { key: 'totalGP', label: '总毛利额', category: 'product', format: r => '¥' + fmt(r.totalGrossProfit) },
  { key: 'grossMarginRate', label: '综合毛利率', category: 'product', format: r => pct(r.grossMarginRate) },
  // 变动费用明细（每项独立可选）
  { key: 'variableCostRate', label: '变动费率合计', category: 'variable', format: r => pct(r.variableCostRate) },
  ...Object.keys(VC_LABELS).map(key => ({
    key: `vc_${key}`, label: VC_LABELS[key], category: 'variable' as const,
    format: (_r: StoreResult, s?: CalculationScenario) => {
      const v = getVC(s, key)
      return v > 0 ? pct(v) : '--'
    },
  })),
  // 固定费用明细（每项独立可选）
  { key: 'totalFixedCost', label: '固定费用合计', category: 'fixed', format: r => '¥' + fmt(r.totalFixedCost) },
  ...Object.keys(FC_LABELS).map(key => ({
    key: `fc_${key}`, label: FC_LABELS[key], category: 'fixed' as const,
    format: (_r: StoreResult, s?: CalculationScenario) => {
      const v = getFC(s, key)
      return v > 0 ? '¥' + fmt(v) : '--'
    },
  })),
  { key: 'weightedCMR', label: '加权CMR', category: 'result', format: r => pct(r.weightedCMR) },
  { key: 'breakevenSales', label: '销售额保本点', category: 'result', format: r => r.breakevenSales ? '¥' + fmt(r.breakevenSales) : '无法盈利' },
  { key: 'safetyMarginRate', label: '安全边际率', category: 'result', format: r => pct(r.safetyMarginRate) },
  { key: 'profit', label: '门店利润', category: 'result', format: r => '¥' + fmt(r.profit) },
  { key: 'dailyContribution', label: '日常边际贡献', category: 'result', format: r => '¥' + fmt(r.dailyContributionAmount) },
  { key: 'dailyContributionRate', label: '日常边际贡献率', category: 'result', format: r => pct(r.dailyContributionRate) },
  ]
}

const CATEGORY_LABELS: Record<string, string> = {
  result: '计算结果', product: '产品结构', variable: '变动费用', fixed: '固定费用',
}

const DEFAULT_METRICS = new Set(['totalSales', 'profit', 'breakevenSales', 'safetyMarginRate', 'weightedCMR', 'variableCostRate'])

/** 各核算模式下有效的变动费用 key */
const MODE_A_KEYS = new Set(['commission','annualRebate','retailDiscount','extraRebate','promotionSupport','channelIncentivePrivate','channelIncentiveReferral','salesCommission','businessCommission','extraIncentive','logisticsFee','promotionFee'])
const MODE_B_KEYS = new Set(['contractRebate','extraRebate','promotionSupport','salesGap','channelIncentivePrivate','channelIncentiveReferral','channelIncentiveOnline','commissionSales','commissionBusiness','retailIncentive','promotionFee'])

/** 判断某变动费用指标是否属于当前模式 */
function vcKeyBelongsToMode(metricKey: string, costMode: 'modeA' | 'modeB'): boolean {
  const vcKey = metricKey.replace('vc_', '')
  return costMode === 'modeA' ? MODE_A_KEYS.has(vcKey) : MODE_B_KEYS.has(vcKey)
}

const ScenarioCompare = memo(function ScenarioCompare({ currentResult, currentScenario }: Props) {
  const { confirm: toastConfirm } = useToast()
  const [rows, setRows] = useState<ScenarioRow[]>([])
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(DEFAULT_METRICS)

  // 自动从已选方案中获取核算模式
  const costMode = useMemo<'modeA' | 'modeB'>(() => {
    // 优先取已选方案中第一个有数据的
    for (const id of Array.from(selectedIds)) {
      const r = rows.find(r => r.id === id)
      const mode = r?.scenario?.singleCategory?.data?.costMode
      if (mode === 'modeA' || mode === 'modeB') return mode
    }
    return 'modeA'
  }, [selectedIds, rows])

  // 动态生成指标列表：取当前方案 + 已选历史方案的系列名并集
  // （RENAME_TIER 后各方案的系列名可能不同，只用单一来源会导致改名方的系列指标显示 "--"）
  const allMetrics = useMemo(() => {
    const all = new Set<string>()
    const collect = (scenario?: CalculationScenario) => {
      if (!scenario) return
      if (scenario.singleCategory?.data?.tierNames) {
        scenario.singleCategory.data.tierNames.forEach(t => all.add(t))
      } else if (scenario.multiCategory?.categories) {
        const first = Object.values(scenario.multiCategory.categories)[0]
        first?.tierNames?.forEach(t => all.add(t))
      }
    }
    collect(currentScenario)
    for (const r of rows) {
      if (selectedIds.has(r.id) && r.scenario) collect(r.scenario)
    }
    return buildAllMetrics(Array.from(all))
  }, [currentScenario, rows, selectedIds])

  const loadList = useCallback(async () => {
    try {
      const list = await fetchScenarios()
      setRows(list.map(s => ({ id: s.id, name: s.name, result: null })))
    } catch { /* backend not available */ }
  }, [])
  useEffect(() => { loadList() }, [loadList])

  const handleClearAll = async () => {
    if (!(await toastConfirm(`确定要删除全部 ${rows.length} 个已保存方案吗？`, '此操作不可撤销。'))) return
    setDeleting(true)
    for (const r of rows) { try { await deleteScenario(r.id) } catch { /* continue */ } }
    setSelectedIds(new Set())
    setRows([])
    setDeleting(false)
  }

  const startRename = (r: ScenarioRow) => { setEditingId(r.id); setEditName(r.name) }

  const confirmRename = async () => {
    const id = editingId
    if (!id || !editName.trim()) { setEditingId(null); return }
    try {
      await updateScenario(id, { name: editName.trim() })
      setRows(prev => prev.map(r => r.id === id ? { ...r, name: editName.trim() } : r))
    } catch { /* ignore */ }
    setEditingId(prev => prev === id ? null : prev) // 防止覆盖其他行的编辑
  }

  const handleDelete = async (r: ScenarioRow) => {
    if (!(await toastConfirm(`确定要删除方案「${r.name}」吗？`))) return
    try {
      await deleteScenario(r.id)
      setRows(prev => prev.filter(row => row.id !== r.id))
      setSelectedIds(prev => { const next = new Set(prev); next.delete(r.id); return next })
    } catch { /* ignore */ }
  }

  const toggleScenario = async (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) { next.delete(id); setSelectedIds(next); return }
    next.add(id); setSelectedIds(next)
    const row = rows.find(r => r.id === id)
    if (!row || row.result) return
    try {
      const response = await fetchScenario(id)
      const scenario = (response as any).data
      if (!scenario) return
      let result: StoreResult | null = null
      if (scenario.singleCategory?.data) {
        result = calcSingleStore(scenario.storeName, scenario.singleCategory.data, scenario.storeFixedCosts)
      } else if (scenario.multiCategory?.categories) {
        const base = calcMultiCategory(scenario.multiCategory.categories, scenario.storeFixedCosts)
        result = { ...base, stepChartData: buildStepChartData(base, true) } as StoreResult
      }
      if (result) {
        setRows(prev => prev.map(r => r.id === id ? { ...r, result, scenario } : r))
      }
    } catch { /* ignore */ }
  }

  const selectedRows = rows.filter(r => selectedIds.has(r.id) && r.result)
  const visibleMetrics = allMetrics.filter(m => {
    if (!selectedMetrics.has(m.key)) return false
    // 变动费用明细按核算模式过滤
    if (m.key.startsWith('vc_') && !vcKeyBelongsToMode(m.key, costMode)) return false
    return true
  })

  const summary = useMemo(() => {
    if (selectedRows.length === 0) return rows.length > 0 ? `${rows.length} 个方案，点击选择对比` : ''
    if (selectedRows.length === 1) return `已选 1 个方案`
    const beps = selectedRows.map(r => r.result?.breakevenSales).filter(Boolean) as number[]
    if (beps.length >= 2) {
      const diff = Math.max(...beps) - Math.min(...beps)
      return `已选 ${selectedRows.length} 个 · 保本点差异 ¥${fmt(diff)}`
    }
    return `已选 ${selectedRows.length} 个方案`
  }, [selectedRows, rows.length])

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const [openCategory, setOpenCategory] = useState<string | null>('result')

  return (
    <div className="surface p-4 mt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">方案对比</h3>
          {summary && <span className="text-[11px] text-[var(--text-muted)]">{summary}</span>}
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button onClick={handleClearAll} disabled={deleting}
              className="text-[11px] text-[var(--text-muted)] hover:text-red-500 font-medium transition-colors disabled:opacity-50">
              {deleting ? '删除中...' : '清空方案'}
            </button>
          )}
          <button onClick={loadList} className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">刷新列表</button>
          <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {rows.length === 0 ? (
            <div className="text-center py-6">
              <svg className="w-8 h-8 text-[var(--border)] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-xs text-[var(--text-muted)]">暂无已保存方案</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">使用"保存方案"按钮保存当前测算方案后即可对比</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                {rows.map(r => (
                  <div key={r.id} className="flex items-center gap-0.5 group">
                    {editingId === r.id ? (
                      <input type="text" value={editName} autoFocus
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditingId(null) }}
                        onBlur={confirmRename}
                        className="text-[11px] px-2 py-1 rounded-full border border-[var(--accent)] bg-white focus:outline-none w-24"
                      />
                    ) : (
                      <>
                        <button onClick={() => toggleScenario(r.id)} onDoubleClick={() => startRename(r)}
                          className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all btn-press ${
                            selectedIds.has(r.id)
                              ? 'bg-[var(--accent)] text-white shadow-sm'
                              : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-light)]'
                          }`}>{r.name}</button>
                        <button onClick={() => handleDelete(r)}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {selectedRows.length > 0 && (
                <div className="flex gap-4">
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[11px] text-[var(--text-muted)]">
                          <th className="text-left py-2 font-medium">指标</th>
                          <th className="text-right py-2 px-3 font-semibold text-[var(--accent)]">当前数据</th>
                          {selectedRows.map(r => (
                            <th key={r.id} className="text-right py-2 px-3 font-semibold text-[var(--text-secondary)]">{r.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleMetrics.map(m => (
                          <tr key={m.key} className="border-b border-[var(--border-light)]">
                            <td className="py-2 text-[var(--text-secondary)]">{m.label}</td>
                            <td className={`text-right py-2 px-3 tabular-nums font-medium ${m.key === 'profit' && currentResult ? (currentResult.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-[var(--accent)]'}`}>
                              {currentResult ? m.format(currentResult, currentScenario) : '--'}
                            </td>
                            {selectedRows.map(r => (
                              <td key={r.id} className={`text-right py-2 px-3 tabular-nums font-medium ${m.key === 'profit' && r.result ? (r.result.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-[var(--text-primary)]'}`}>
                                {r.result ? m.format(r.result, r.scenario) : '--'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="w-52 flex-shrink-0 border-l border-[var(--border-light)] pl-4">
                    <h4 className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">选择指标</h4>
                    {(['result', 'product', 'variable', 'fixed'] as const).map(cat => {
                      const allCatMetrics = allMetrics.filter(m => {
                        if (m.category !== cat) return false
                        if (m.key.startsWith('vc_') && !vcKeyBelongsToMode(m.key, costMode)) return false
                        return true
                      })
                      if (allCatMetrics.length === 0) return null
                      const isOpen = openCategory === cat
                      return (
                        <div key={cat} className="mb-0.5">
                          <button onClick={() => setOpenCategory(isOpen ? null : cat)}
                            className="flex items-center gap-1 w-full text-left py-1 hover:text-[var(--text-primary)] transition-colors">
                            <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{CATEGORY_LABELS[cat]}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                              {allCatMetrics.filter(m => selectedMetrics.has(m.key)).length}/{allCatMetrics.length}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="ml-4 space-y-0.5">
                              {allCatMetrics.map(m => (
                                <label key={m.key} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                                  <input type="checkbox" checked={selectedMetrics.has(m.key)}
                                    onChange={() => toggleMetric(m.key)}
                                    className="w-3 h-3 rounded accent-[var(--accent)]" />
                                  <span className="text-[10px] text-[var(--text-secondary)] leading-tight">{m.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
})

export default ScenarioCompare
