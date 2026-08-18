import { useState, useEffect, useMemo, Fragment } from 'react'
import { fetchScenarios, fetchScenario, deleteScenario } from '../../services/api'
import { useToast } from '../../../../components/ui/toast'
import { calcMultiCategory, buildStepChartData } from '../../../../shared/calc/calculator'
import { getCostGroups } from '../../data/costModeLabels'
import type { StoreResult, CalculationScenario, CostMode } from '../../../../shared/types/scenario'

interface ScenarioRow {
  id: string
  name: string
  result: StoreResult | null
  scenario?: CalculationScenario
}

interface Props {
  currentResult: StoreResult | null
  currentScenario?: CalculationScenario | null
}

interface ResultEntry {
  name: string
  result: StoreResult
  scenario?: CalculationScenario
  isCurrent: boolean
}

const ALL_CATEGORIES = ['智屏', '白电', '空调', 'CIoT']

function fmt(n: number): string { return Math.round(n).toLocaleString() }
function pct(n: number): string { return (n * 100).toFixed(1) + '%' }
function yen(n: number): string { return '¥' + fmt(n) }

function renderCell(v: number, values: number[], hasNegative: boolean) {
  const maxV = Math.max(...values.map(Math.abs))
  const isNeg = v < 0
  const absV = Math.abs(v)
  const isMax = hasNegative ? v === Math.max(...values) : absV === maxV && absV > 0
  if (isNeg) return 'text-red-500 font-medium'
  if (isMax) return 'text-emerald-600 font-semibold'
  return 'text-[var(--text-secondary)]'
}

export default function MultiCompare({ currentResult, currentScenario }: Props) {
  const { confirm: toastConfirm } = useToast()
  const [rows, setRows] = useState<ScenarioRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('门店总览')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadList() }, [])

  const loadList = async () => {
    try {
      const list = await fetchScenarios()
      setRows(list.map(s => ({ id: s.id, name: s.name, result: null })))
    } catch { /* ignore */ }
  }

  const handleDelete = async (r: ScenarioRow) => {
    if (!(await toastConfirm(`确定要删除方案「${r.name}」吗？`))) return
    try { await deleteScenario(r.id) } catch { /* ignore */ }
    setRows(prev => prev.filter(row => row.id !== r.id))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(r.id); return n })
  }

  const handleClearAll = async () => {
    if (rows.length === 0) return
    if (!(await toastConfirm(`确定要删除全部 ${rows.length} 个已保存方案吗？`))) return
    setDeleting(true)
    for (const r of rows) { try { await deleteScenario(r.id) } catch { /* continue */ } }
    setSelectedIds(new Set()); setRows([]); setDeleting(false)
  }

  const toggleScenario = async (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) { next.delete(id); setSelectedIds(next); return }
    next.add(id); setSelectedIds(next)
    const row = rows.find(r => r.id === id)
    if (!row || row.result) return
    try {
      const res = await fetchScenario(id)
      const scenario = (res as any).data
      if (scenario?.multiCategory?.categories) {
        const base = calcMultiCategory(scenario.multiCategory.categories, scenario.storeFixedCosts)
        const result = { ...base, stepChartData: buildStepChartData(base, true) } as StoreResult
        setRows(prev => prev.map(r => r.id === id ? { ...r, result, scenario } : r))
      }
    } catch { /* ignore */ }
  }

  const multiRows = rows.filter(r => selectedIds.has(r.id) && r.result && r.scenario?.multiCategory?.categories)

  const allResults = useMemo<ResultEntry[]>(() => {
    const list = multiRows.map(r => ({ name: r.name, result: r.result!, scenario: r.scenario, isCurrent: false }))
    if (currentResult?.categoryResults && Object.keys(currentResult.categoryResults).length > 1) {
      list.unshift({ name: '当前方案', result: currentResult, scenario: currentScenario ?? undefined, isCurrent: true })
    }
    return list
  }, [multiRows, currentResult, currentScenario])

  const availableCats = useMemo(() =>
    ALL_CATEGORIES.filter(c => allResults.some(r => r.result.categoryResults[c])),
    [allResults])

  const tabs = ['门店总览', ...availableCats]

  return (
    <div className="surface p-4 mt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">多品类方案对比</h3>
          {allResults.length > 0 && <span className="text-[11px] text-[var(--text-muted)]">{allResults.length} 个方案</span>}
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button onClick={handleClearAll} disabled={deleting}
              className="text-[11px] text-[var(--text-muted)] hover:text-red-500 font-medium disabled:opacity-50">
              {deleting ? '删除中...' : '清空方案'}
            </button>
          )}
          <button onClick={loadList} className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">刷新列表</button>
          <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map(r => (
              <label key={r.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] cursor-pointer transition-all ${
                selectedIds.has(r.id) ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                  : 'border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--border)]'
              }`}>
                <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleScenario(r.id)} className="accent-[var(--accent)] w-3 h-3" />
                {r.name}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r) }} className="ml-1 text-[var(--text-muted)] hover:text-red-500 leading-none">&times;</button>
              </label>
            ))}
            {rows.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">暂无已保存方案，请先保存方案</span>}
          </div>

          {allResults.length > 0 && (
            <>
              <div className="flex gap-1 mt-3 border-b border-[var(--border-light)]">
                {tabs.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                      activeTab === t ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}>{t}</button>
                ))}
              </div>
              <div className="mt-3 space-y-4">
                {activeTab === '门店总览' ? <StoreKpiSection results={allResults} /> : <CategorySection catName={activeTab} results={allResults} />}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── 门店总览 ── */

function StoreKpiSection({ results }: { results: ResultEntry[] }) {
  const rows: Array<[string, (r: StoreResult) => number | null, (v: number) => string, boolean?]> = [
    ['合计销售额', r => r.totalSales, yen],
    ['总毛利额', r => r.totalGrossProfit, yen],
    ['综合毛利率', r => r.grossMarginRate, pct],
    ['变动费率合计', r => r.variableCostRate, pct],
    ['固定费用合计', r => r.totalFixedCost, yen],
    ['加权 CMR', r => r.weightedCMR, pct],
    ['边际贡献额', r => r.contributionAmount, yen],
    ['总部补贴', r => r.totalSubsidy, yen],
    ['日常边际贡献', r => r.dailyContributionAmount, yen],
    ['日常边际贡献率', r => r.dailyContributionRate, pct],
    ['门店利润', r => r.profit, yen, true],
    ['销售额保本点', r => r.breakevenSales, yen],
    ['安全边际率', r => r.safetyMarginRate, pct],
    ['品类层 BEP', r => (r as any).categoryBEP ?? null, yen],
  ]

  return <CompactTable title="门店关键指标" rows={rows} results={results} />
}

/* ── 品类视图 ── */

function CategorySection({ catName, results }: { catName: string; results: ResultEntry[] }) {
  return (
    <>
      <SeriesSection catName={catName} results={results} />
      <CatKpiSection catName={catName} results={results} />
      <VariableCostSection catName={catName} results={results} />
    </>
  )
}

function SeriesSection({ catName, results }: { catName: string; results: ResultEntry[] }) {
  const heads = results.map(r => r.name)

  // 收集所有方案在该品类的系列名并集（各方案 RENAME_TIER 后系列名可能不同）
  const tierNames = useMemo(() => {
    const all = new Set<string>()
    for (const r of results) {
      const catData = r.scenario?.multiCategory?.categories[catName]
        || r.scenario?.singleCategory?.data
      for (const t of (catData?.tierNames as string[]) || ['X', 'C', 'P', 'S']) all.add(t)
    }
    return Array.from(all)
  }, [results, catName])

  const seriesMetrics: Array<{
    label: string; get: (cr: StoreResult['categoryResults'][string], tier: string) => number
    fmt: (v: number) => string; hasNeg: boolean
    total: (cr: StoreResult['categoryResults'][string]) => number
  }> = [
    { label: '销售额', get: (cr, t) => cr?.tierResults[t]?.sales ?? 0, fmt: yen, hasNeg: false, total: cr => cr.totalSales },
    { label: '销量', get: (cr, t) => cr?.tierResults[t]?.volume ?? 0, fmt: v => fmt(v), hasNeg: false, total: cr => tierNames.reduce((s, tn) => s + (cr.tierResults[tn]?.volume ?? 0), 0) },
    { label: '毛利率', get: (cr, t) => cr?.tierResults[t]?.grossMargin ?? 0, fmt: pct, hasNeg: false, total: cr => cr.totalSales > 0 ? cr.totalGrossProfit / cr.totalSales : 0 },
    { label: 'CMR', get: (cr, t) => cr?.tierResults[t]?.cmr ?? 0, fmt: pct, hasNeg: true, total: cr => cr.weightedCMR },
    { label: '边际贡献', get: (cr, t) => cr?.tierResults[t]?.contributionAmount ?? 0, fmt: yen, hasNeg: true, total: cr => cr.contributionAmount },
  ]

  return (
    <div className="border border-[var(--border-light)] rounded-lg overflow-hidden">
      <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-3 py-2 bg-[var(--bg)] border-b border-[var(--border-light)]">{catName} · 系列明细</div>
      {seriesMetrics.map(metric => (
        <table key={metric.label} className="w-full text-[11px] border-b border-[var(--border-light)]" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="text-[var(--text-muted)] bg-[var(--bg)]/50">
              <th className="text-left py-1.5 px-3 font-medium" style={{ width: '100px' }}>{metric.label}</th>
              {heads.map((h, i) => <th key={i} className={`text-right py-1.5 px-2 font-medium ${results[i].isCurrent ? 'text-[var(--accent)]' : ''}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {tierNames.map(tier => {
              const vals = results.map(r => { const cr = r.result.categoryResults[catName]; return cr ? metric.get(cr, tier) : 0 })
              return (
                <tr key={tier} className="border-b border-[var(--border-light)]">
                  <td className="py-1.5 px-3 font-bold text-[var(--text-secondary)]">{tier}</td>
                  {vals.map((v, i) => <td key={i} className={`text-right py-1.5 px-2 tabular-nums ${renderCell(v, vals, metric.hasNeg)}`}>{metric.fmt(v)}</td>)}
                </tr>
              )
            })}
            <tr className="bg-[var(--bg)] font-semibold">
              <td className="py-1.5 px-3 text-[var(--text-secondary)]">合计</td>
              {results.map((r, i) => {
                const cr = r.result.categoryResults[catName]
                const total = cr ? metric.total(cr) : 0
                return <td key={i} className={`text-right py-1.5 px-2 tabular-nums ${r.isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{metric.fmt(total)}</td>
              })}
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  )
}

function CatKpiSection({ catName, results }: { catName: string; results: ResultEntry[] }) {
  const rows: Array<[string, (cr: StoreResult['categoryResults'][string]) => number | null, (v: number) => string, boolean?]> = [
    ['销售额', cr => cr.totalSales, yen],
    ['毛利额', cr => cr.totalGrossProfit, yen],
    ['变动费用', cr => cr.totalVariableCost, yen],
    ['变动费率', cr => cr.variableCostRate, pct],
    ['加权 CMR', cr => cr.weightedCMR, pct],
    ['边际贡献额', cr => cr.contributionAmount, yen, true],
  ]

  const data = results.map(r => ({ name: r.name, isCurrent: r.isCurrent, cr: r.result.categoryResults[catName] }))

  return (
    <div className="border border-[var(--border-light)] rounded-lg overflow-hidden">
      <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-3 py-2 bg-[var(--bg)] border-b border-[var(--border-light)]">{catName} · 品类指标</div>
      <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
            <th className="text-left py-1.5 px-3 font-medium" style={{ width: '100px' }}>指标</th>
            {data.map((d, i) => <th key={i} className={`text-right py-1.5 px-2 font-medium ${d.isCurrent ? 'text-[var(--accent)]' : ''}`}>{d.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, getVal, formatFn, hasNeg]) => {
            const vals = data.map(d => d.cr ? (getVal(d.cr) ?? 0) : 0)
            return (
              <tr key={label} className="border-b border-[var(--border-light)]">
                <td className="py-1.5 px-3 text-[var(--text-secondary)]">{label}</td>
                {vals.map((v, i) => <td key={i} className={`text-right py-1.5 px-2 tabular-nums font-medium ${renderCell(v, vals, !!hasNeg)}`}>{formatFn(v)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VariableCostSection({ catName, results }: { catName: string; results: ResultEntry[] }) {
  const costMode: CostMode = useMemo(() => {
    for (const r of results) {
      const cats = r.scenario?.multiCategory?.categories
      if (cats?.[catName]) return (cats[catName] as any).costMode || 'modeA'
    }
    return 'modeA'
  }, [results, catName])

  const groups = getCostGroups(costMode)
  const data = results.map(r => {
    const vc = (r.scenario?.multiCategory?.categories?.[catName] as any)?.variableCosts || {}
    return { name: r.name, isCurrent: r.isCurrent, vc }
  })

  const modeLabel = costMode === 'modeA' ? '倒扣制核算法' : '顺加制核算法'

  return (
    <div className="border border-[var(--border-light)] rounded-lg overflow-hidden">
      <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-3 py-2 bg-[var(--bg)] border-b border-[var(--border-light)]">{catName} · 变动费用明细（{modeLabel}）</div>
      <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
            <th className="text-left py-1.5 px-3 font-medium" style={{ width: '100px' }}>费用项</th>
            {data.map((d, i) => <th key={i} className={`text-right py-1.5 px-2 font-medium ${d.isCurrent ? 'text-[var(--accent)]' : ''}`}>{d.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <Fragment key={g.title}>
              <tr><td colSpan={data.length + 1} className="py-1 px-3 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg)]/50">{g.title}</td></tr>
              {g.items.map(item => {
                const vals = data.map(d => (d.vc[item.key] ?? 0) as number)
                return (
                  <tr key={item.key} className="border-b border-[var(--border-light)]">
                    <td className="py-1.5 px-3 text-[var(--text-secondary)]">{item.label}</td>
                    {vals.map((v, i) => <td key={i} className={`text-right py-1.5 px-2 tabular-nums ${renderCell(v, vals, false)}`}>{pct(v)}</td>)}
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompactTable({ title, rows, results }: {
  title: string
  rows: Array<[string, (r: StoreResult) => number | null, (v: number) => string, boolean?]>
  results: ResultEntry[]
}) {
  return (
    <div className="border border-[var(--border-light)] rounded-lg overflow-hidden">
      <div className="text-[11px] font-semibold text-[var(--text-secondary)] px-3 py-2 bg-[var(--bg)] border-b border-[var(--border-light)]">{title}</div>
      <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
            <th className="text-left py-1.5 px-3 font-medium" style={{ width: '110px' }}>指标</th>
            {results.map((r, i) => <th key={i} className={`text-right py-1.5 px-2 font-medium ${r.isCurrent ? 'text-[var(--accent)]' : ''}`}>{r.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, getVal, formatFn, hasNeg]) => {
            const vals = results.map(r => getVal(r.result) ?? 0)
            return (
              <tr key={label} className="border-b border-[var(--border-light)]">
                <td className="py-1.5 px-3 text-[var(--text-secondary)]">{label}</td>
                {vals.map((v, i) => <td key={i} className={`text-right py-1.5 px-2 tabular-nums font-medium ${renderCell(v, vals, !!hasNeg)}`}>{formatFn(v)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
