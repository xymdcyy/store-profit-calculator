import { useState, useMemo } from 'react'
import { batchImport } from '../../services/api'
import { useToast } from '../../../../components/ui/toast'
import { calcSingleStore, calcMultiCategory, buildStepChartData } from '../../../../shared/calc/calculator'
import { useFormatMoney } from '../../../../shell/UnitContext'
import type { StoreResult } from '../../../../shared/types/scenario'

interface StoreEntry {
  fileName: string
  storeName: string
  result: StoreResult | null
  error?: string
  type: 'single' | 'multi'
}

function pct(n: number) { return (n * 100).toFixed(1) + '%' }

/* ── StoreCard ──────────────────────────────── */

function StoreCard({ store, fm }: { store: StoreEntry; fm: (n: number) => string }) {
  const r = store.result
  if (!r) return (
    <div className="surface p-4 border-red-200 bg-red-50">
      <p className="text-xs font-semibold text-red-600 truncate">{store.storeName}</p>
      <p className="text-[10px] text-red-400 mt-1">{store.error || '解析失败'}</p>
    </div>
  )
  const profitTone = r.profit > 0 ? 'text-emerald-600' : r.profit < 0 ? 'text-red-500' : 'text-slate-600'
  const marginTone = (r.safetyMarginRate ?? 0) > 0.1 ? 'text-emerald-600' : (r.safetyMarginRate ?? 0) > 0 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="surface p-4 hover:border-[var(--accent)] transition-colors">
      <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2 truncate">{store.storeName}</h3>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between"><span className="text-[var(--text-muted)]">利润</span><span className={`font-bold tabular-nums ${profitTone}`}>¥{fm(r.profit)}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-muted)]">保本点</span><span className="font-medium tabular-nums">¥{fm(r.breakevenSales ?? 0)}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-muted)]">安全边际</span><span className={`font-medium tabular-nums ${marginTone}`}>{r.safetyMarginRate != null ? pct(r.safetyMarginRate) : '--'}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-muted)]">销售额</span><span className="font-medium tabular-nums">¥{fm(r.totalSales)}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-muted)]">加权CMR</span><span className="font-medium tabular-nums">{pct(r.weightedCMR)}</span></div>
      </div>
    </div>
  )
}

/* ── BatchTable ──────────────────────────────── */

function yen(n: number, fm: (n: number) => string) { return '¥' + fm(n) }

const ALL_COLS = [
  { key: 'totalSales', label: '销售额', fmt: (r: StoreResult, fm: any) => yen(r.totalSales, fm) },
  { key: 'totalGP', label: '毛利额', fmt: (r: StoreResult, fm: any) => yen(r.totalGrossProfit, fm) },
  { key: 'grossMarginRate', label: '毛利率', fmt: (r: StoreResult) => pct(r.grossMarginRate) },
  { key: 'variableCostRate', label: '变动费率', fmt: (r: StoreResult) => pct(r.variableCostRate) },
  { key: 'totalFixedCost', label: '固定费用', fmt: (r: StoreResult, fm: any) => yen(r.totalFixedCost, fm) },
  { key: 'weightedCMR', label: '加权CMR', fmt: (r: StoreResult) => pct(r.weightedCMR) },
  { key: 'breakevenSales', label: '保本点', fmt: (r: StoreResult, fm: any) => r.breakevenSales ? yen(r.breakevenSales, fm) : '--' },
  { key: 'safetyMarginRate', label: '安全边际', fmt: (r: StoreResult) => pct(r.safetyMarginRate ?? 0) },
  { key: 'profit', label: '利润', fmt: (r: StoreResult, fm: any) => yen(r.profit, fm) },
  { key: 'dailyContribution', label: '边际贡献', fmt: (r: StoreResult, fm: any) => yen(r.dailyContributionAmount, fm) },
]
const DEFAULT_COLS = new Set(['totalSales', 'profit', 'breakevenSales', 'weightedCMR'])

function BatchTable({ stores, formatMoney }: { stores: StoreEntry[]; formatMoney: (n: number) => string }) {
  const [cols, setCols] = useState(DEFAULT_COLS)
  const visible = ALL_COLS.filter(c => cols.has(c.key))
  const valid = stores.filter(s => s.result)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ALL_COLS.map(c => (
          <label key={c.key} className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer transition-colors ${cols.has(c.key) ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
            <input type="checkbox" className="hidden" checked={cols.has(c.key)} onChange={() => setCols(p => { const n = new Set(p); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n })} />
            {c.label}
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
              <th className="text-left py-2 px-3 font-medium" style={{ width: '130px' }}>门店</th>
              {visible.map(c => <th key={c.key} className="text-right py-2 px-2 font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {valid.map(s => (
              <tr key={s.fileName} className="border-b border-[var(--border-light)] hover:bg-[var(--bg)]">
                <td className="py-2 px-3 font-medium text-[var(--text-secondary)] truncate">{s.storeName}</td>
                {visible.map(c => (
                  <td key={c.key} className={`text-right py-2 px-2 tabular-nums font-medium ${c.key === 'profit' ? (s.result!.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-[var(--text-secondary)]'}`}>
                    {c.fmt(s.result!, formatMoney)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── BatchCompare ────────────────────────────── */

export default function BatchCompare({ onClose }: { onClose: () => void }) {
  const { formatMoney } = useFormatMoney()
  const { toast } = useToast()
  const [stores, setStores] = useState<StoreEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [sortBy, setSortBy] = useState<'profit' | 'bep' | 'margin'>('profit')

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await batchImport()
      if (res.success && res.stores) {
        const entries: StoreEntry[] = res.stores.map((s: any) => {
          if (s.error) return { fileName: s.fileName, storeName: s.fileName, result: null, error: s.error, type: 'single' }
          try {
            let result: StoreResult | null = null
            const fc = s.data?.storeFixedCosts || { venueFee: 0, boothCost: 0, laborCost: 0, dailyExpense: 0, operationSupport: 0 }
            if (s.type === 'multi' && s.data?.categories) {
              const base = calcMultiCategory(s.data.categories, fc)
              result = { ...base, stepChartData: buildStepChartData(base, true) } as StoreResult
            } else if (s.data?.data) {
              result = calcSingleStore(s.data.storeName || s.fileName, s.data.data, fc)
            }
            return { fileName: s.fileName, storeName: s.data?.storeName || s.fileName, result, type: s.type }
          } catch (e: any) {
            return { fileName: s.fileName, storeName: s.fileName, result: null, error: e.message, type: s.type }
          }
        })
        setStores(entries)
      } else {
        toast({ type: 'error', title: '导入失败', message: res.error })
      }
    } catch { toast({ type: 'error', title: '导入失败', message: '请确认后端已启动' }) }
    finally { setLoading(false) }
  }

  const sorted = useMemo(() => {
    return [...stores].sort((a, b) => {
      if (sortBy === 'profit') return (b.result?.profit ?? -Infinity) - (a.result?.profit ?? -Infinity)
      if (sortBy === 'bep') return (a.result?.breakevenSales ?? Infinity) - (b.result?.breakevenSales ?? Infinity)
      return (b.result?.safetyMarginRate ?? -Infinity) - (a.result?.safetyMarginRate ?? -Infinity)
    })
  }, [stores, sortBy])

  const validStores = stores.filter(s => s.result)
  const totalProfit = validStores.reduce((sum, s) => sum + (s.result?.profit ?? 0), 0)
  const avgMargin = validStores.length > 0
    ? validStores.reduce((sum, s) => sum + (s.result?.safetyMarginRate ?? 0), 0) / validStores.length
    : 0
  const failedCount = stores.filter(s => s.error).length

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div className="surface-elevated w-[1000px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-light)] sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold">多门店批量对比</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {stores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-muted)] mb-4">选择包含门店模板 Excel 的文件夹</p>
              <button onClick={handleImport} disabled={loading}
                className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all">
                {loading ? '解析中...' : '选择文件夹'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="surface p-3 text-center"><div className="text-[10px] text-[var(--text-muted)]">门店数</div><div className="text-lg font-bold">{validStores.length}</div></div>
                <div className="surface p-3 text-center"><div className="text-[10px] text-[var(--text-muted)]">合计利润</div><div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{formatMoney(totalProfit)}</div></div>
                <div className="surface p-3 text-center"><div className="text-[10px] text-[var(--text-muted)]">平均安全边际</div><div className="text-lg font-bold">{(avgMargin * 100).toFixed(1)}%</div></div>
                <div className="surface p-3 text-center"><div className="text-[10px] text-[var(--text-muted)]">解析失败</div><div className={`text-lg font-bold ${failedCount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{failedCount}</div></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-[var(--bg)] rounded-lg p-0.5">
                  {(['cards', 'table'] as const).map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${view === v ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                      {v === 'cards' ? '卡片排名' : '表格明细'}
                    </button>
                  ))}
                </div>
                {view === 'cards' && (
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--text-muted)]">排序：</span>
                    {([['profit', '利润'], ['bep', '保本点'], ['margin', '安全边际']] as const).map(([k, label]) => (
                      <button key={k} onClick={() => setSortBy(k)} className={`px-2 py-0.5 rounded transition-colors ${sortBy === k ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
              {view === 'cards' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {sorted.map(s => <StoreCard key={s.fileName} store={s} fm={formatMoney} />)}
                </div>
              ) : (
                <BatchTable stores={validStores} formatMoney={formatMoney} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
