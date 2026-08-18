# 多门店批量对比 & 利润目标反推 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现多门店批量导入对比 + 利润目标反推，不修改现有模板格式。

**Architecture:** 批量导入复用现有 `excel-parser.ts` 的解析逻辑，新增 IPC 通道 `batch:import` 扫描文件夹并逐个解析。利润反推新增独立计算模块 `goalSeek.ts`，不修改 `calculator.ts`。两个功能在简洁版和专业版均有入口。

**Tech Stack:** 同主项目 — Electron + React 19 + TypeScript + Recharts + ExcelJS

---

## Phase 1: 批量导入后台（主进程）

### Task 1: IPC 通道 — 文件夹批量导入

**Files:**
- Modify: `src/main/ipc-handlers.ts`（新增 `batch:import` handler）
- Modify: `src/preload/index.ts`（新增 `batchImport` 方法）
- Modify: `src/renderer/src/env.d.ts`（新增类型声明）
- Modify: `src/renderer/src/modes/simple/services/api.ts`（新增导出函数）

**Step 1: 添加 IPC handler**

在 `ipc-handlers.ts` 的 `registerIpcHandlers` 中添加：

```typescript
ipcMain.handle('batch:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择包含门店模板的文件夹',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '用户取消' }
    }
    const dir = result.filePaths[0]
    const files = readdirSync(dir).filter(f => f.endsWith('.xlsx'))
    if (files.length === 0) return { success: false, error: '文件夹内没有 Excel 文件' }

    const stores: any[] = []
    for (const file of files) {
      const filePath = path.join(dir, file)
      try {
        // 自动检测单/多品类
        try {
          const data = await parseMultiExcel(filePath)
          stores.push({ fileName: file, type: 'multi', data })
        } catch {
          try {
            const data = await parseSingleExcel(filePath)
            stores.push({ fileName: file, type: 'single', data })
          } catch (e: any) {
            stores.push({ fileName: file, error: e.message || '解析失败' })
          }
        }
      } catch (e: any) {
        stores.push({ fileName: file, error: e.message || '解析失败' })
      }
    }
    return { success: true, stores }
  })
```

需要新增导入：
```typescript
import { readdirSync } from 'fs'
import path from 'path'
```

**Step 2: 添加 preload 桥接**

在 `src/preload/index.ts` 的 `electronAPI` 对象中添加：
```typescript
batchImport: () => ipcRenderer.invoke('batch:import'),
```

**Step 3: 更新类型声明**

在 `env.d.ts` 的 `ElectronAPI` 接口中添加：
```typescript
batchImport(): Promise<{ success: boolean; stores?: any[]; error?: string }>
```

**Step 4: 更新 api.ts**

添加导出函数：
```typescript
export async function batchImport(): Promise<{ success: boolean; stores?: any[]; error?: string }> {
  return window.electronAPI.batchImport()
}
```

**Step 5: 验证**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npx electron-vite build`
Expected: 编译通过

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add batch import IPC channel for multi-store folder import"
```

---

## Phase 2: 批量对比渲染层

### Task 2: 批量对比容器组件

**Files:**
- Create: `src/renderer/src/modes/simple/components/analysis/BatchCompare.tsx`
- Create: `src/renderer/src/modes/simple/components/analysis/StoreCard.tsx`
- Create: `src/renderer/src/modes/simple/components/analysis/BatchTable.tsx`

**Step 1: 创建 BatchCompare 容器**

```tsx
import { useState, useMemo } from 'react'
import { batchImport } from '../../services/api'
import { calcSingleStore, calcMultiCategory, buildStepChartData } from '../../../../shared/calc/calculator'
import { useFormatMoney } from '../../../../shell/UnitContext'
import StoreCard from './StoreCard'
import BatchTable from './BatchTable'
import type { StoreResult } from '../../../../shared/types/scenario'

interface StoreEntry {
  fileName: string
  storeName: string
  result: StoreResult | null
  error?: string
  type: 'single' | 'multi'
}

export default function BatchCompare({ onClose }: { onClose: () => void }) {
  const { formatMoney } = useFormatMoney()
  const [stores, setStores] = useState<StoreEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [sortBy, setSortBy] = useState<'profit' | 'bep' | 'margin'>('profit')

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await batchImport()
      if (res.success && res.stores) {
        const entries = res.stores.map((s: any) => {
          if (s.error) return { fileName: s.fileName, storeName: s.fileName, result: null, error: s.error, type: 'single' as const }
          try {
            let result: StoreResult | null = null
            if (s.type === 'multi' && s.data?.categories) {
              const base = calcMultiCategory(s.data.categories, s.data.storeFixedCosts || {})
              result = { ...base, stepChartData: buildStepChartData(base, true) } as StoreResult
            } else if (s.data?.data) {
              result = calcSingleStore(s.data.storeName || s.fileName, s.data.data, s.data.storeFixedCosts || {})
            }
            return { fileName: s.fileName, storeName: s.data?.storeName || s.fileName, result, type: s.type }
          } catch (e: any) {
            return { fileName: s.fileName, storeName: s.fileName, result: null, error: e.message, type: s.type }
          }
        })
        setStores(entries)
      } else {
        alert(res.error || '导入失败')
      }
    } catch { alert('导入失败，请确认后端已启动') }
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div className="surface-elevated w-[1000px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-light)] sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold">多门店批量对比</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {stores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-muted)] mb-4">选择包含门店模板 Excel 的文件夹</p>
              <button onClick={handleImport} disabled={loading}
                className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium">
                {loading ? '解析中...' : '选择文件夹'}
              </button>
            </div>
          ) : (
            <>
              {/* 统计栏 */}
              <div className="grid grid-cols-4 gap-3">
                <div className="surface p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">门店数</div>
                  <div className="text-lg font-bold">{validStores.length}</div>
                </div>
                <div className="surface p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">合计利润</div>
                  <div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{formatMoney(totalProfit)}</div>
                </div>
                <div className="surface p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">平均安全边际</div>
                  <div className="text-lg font-bold">{avgMargin.toFixed(1)}%</div>
                </div>
                <div className="surface p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">解析失败</div>
                  <div className="text-lg font-bold text-red-500">{stores.filter(s => s.error).length}</div>
                </div>
              </div>
              {/* 视图切换 + 排序 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-[var(--bg)] rounded-lg p-0.5">
                  {(['cards', 'table'] as const).map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md ${view === v ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                      {v === 'cards' ? '卡片排名' : '表格明细'}
                    </button>
                  ))}
                </div>
                {view === 'cards' && (
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--text-muted)]">排序：</span>
                    {([['profit', '利润'], ['bep', '保本点'], ['margin', '安全边际']] as const).map(([k, label]) => (
                      <button key={k} onClick={() => setSortBy(k)}
                        className={`px-2 py-0.5 rounded ${sortBy === k ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* 视图内容 */}
              {view === 'cards' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {sorted.map(s => (
                    <StoreCard key={s.fileName} store={s} formatMoney={formatMoney} />
                  ))}
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
```

**Step 2: 创建 StoreCard**

```tsx
interface StoreCardProps {
  store: StoreEntry
  formatMoney: (n: number) => string
}

export default function StoreCard({ store, formatMoney }: StoreCardProps) {
  const r = store.result
  if (!r) return (
    <div className="surface p-4 border-red-200 bg-red-50">
      <p className="text-xs font-semibold text-red-600">{store.storeName}</p>
      <p className="text-[10px] text-red-400">{store.error || '解析失败'}</p>
    </div>
  )

  const profitTone = r.profit > 0 ? 'text-emerald-600' : r.profit < 0 ? 'text-red-500' : 'text-slate-600'
  const marginTone = (r.safetyMarginRate ?? 0) > 0.1 ? 'text-emerald-600' : (r.safetyMarginRate ?? 0) > 0 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="surface p-4 hover:border-[var(--accent)] transition-colors">
      <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2 truncate">{store.storeName}</h3>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">利润</span>
          <span className={`font-bold tabular-nums ${profitTone}`}>¥{formatMoney(r.profit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">保本点</span>
          <span className="font-medium tabular-nums">¥{formatMoney(r.breakevenSales ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">安全边际</span>
          <span className={`font-medium tabular-nums ${marginTone}`}>{r.safetyMarginRate != null ? (r.safetyMarginRate * 100).toFixed(1) + '%' : '--'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">销售额</span>
          <span className="font-medium tabular-nums">¥{formatMoney(r.totalSales)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">加权CMR</span>
          <span className="font-medium tabular-nums">{(r.weightedCMR * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: 创建 BatchTable**

```tsx
import { useState } from 'react'
import type { StoreResult } from '../../../../shared/types/scenario'

interface BatchTableProps {
  stores: { storeName: string; result: StoreResult }[]
  formatMoney: (n: number) => string
}

function pct(n: number) { return (n * 100).toFixed(1) + '%' }
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
  { key: 'dailyContribution', label: '日常边际贡献', fmt: (r: StoreResult, fm: any) => yen(r.dailyContributionAmount, fm) },
]

const DEFAULT_COLS = new Set(['totalSales', 'profit', 'breakevenSales', 'weightedCMR'])

export default function BatchTable({ stores, formatMoney }: BatchTableProps) {
  const [cols, setCols] = useState(DEFAULT_COLS)

  const visible = ALL_COLS.filter(c => cols.has(c.key))
  const vals = ALL_COLS.map(c => stores.map(s => c.fmt(s.result, formatMoney)).map(Number).filter(n => !isNaN(n)))

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ALL_COLS.map(c => (
          <label key={c.key} className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer ${cols.has(c.key) ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
            <input type="checkbox" className="hidden" checked={cols.has(c.key)} onChange={() => setCols(p => { const n = new Set(p); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n })} />
            {c.label}
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border-light)]">
              <th className="text-left py-2 px-3 font-medium" style={{ width: '120px' }}>门店</th>
              {visible.map(c => <th key={c.key} className="text-right py-2 px-2 font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {stores.map(s => (
              <tr key={s.storeName} className="border-b border-[var(--border-light)] hover:bg-[var(--bg)]">
                <td className="py-2 px-3 font-medium text-[var(--text-secondary)] truncate">{s.storeName}</td>
                {visible.map(c => (
                  <td key={c.key} className={`text-right py-2 px-2 tabular-nums font-medium ${c.key === 'profit' ? (s.result.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-[var(--text-secondary)]'}`}>
                    {c.fmt(s.result, formatMoney)}
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
```

**Step 4: 在两个模式添加入口**

简洁模式 — 在 `SimpleApp.tsx` Header 的 actions 区添加按钮：
```tsx
const [showBatch, setShowBatch] = useState(false)
// ...
<button onClick={() => setShowBatch(true)}
  className="px-2.5 py-1.5 text-[11px] font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-all btn-press">
  批量对比
</button>
// ...
{showBatch && <BatchCompare onClose={() => setShowBatch(false)} />}
```

专业模式 — 在 `ProLayout.tsx` 导航区或 `CalculatorPage.tsx` 工具栏添加同上按钮。

**Step 5: 验证**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npx electron-vite build`
Expected: 编译通过

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add batch store comparison with card and table views"
```

---

## Phase 3: 利润目标反推

### Task 3: 计算引擎 — goalSeek.ts

**Files:**
- Create: `src/renderer/src/shared/calc/goalSeek.ts`

**Step 1: 创建反推函数**

```typescript
import type { StoreResult } from '../types/scenario'

interface GoalSeekResult {
  /** 提高销售额方案 */
  requiredSales: number | null
  salesGap: number | null
  salesGapPerTier: Record<string, number> | null

  /** 提高毛利率方案 */
  requiredGrossMargin: number | null
  grossMarginGap: number | null

  /** 压降费用方案 */
  requiredCostReduction: number | null
}

/**
 * 利润目标反推
 * @param result 当前计算结果
 * @param targetProfit 目标利润（元）
 * @returns 三种反推方案的结果
 */
export function goalSeek(result: StoreResult, targetProfit: number): GoalSeekResult {
  const wcmr = result.weightedCMR
  const subsidy = result.totalSubsidy
  const fc = result.totalFixedCost
  const sales = result.totalSales

  // 无法盈利
  if (wcmr <= 0) {
    return {
      requiredSales: null, salesGap: null, salesGapPerTier: null,
      requiredGrossMargin: null, grossMarginGap: null,
      requiredCostReduction: null,
    }
  }

  // A. 提高销售额
  const requiredSales = (targetProfit + fc - subsidy) / wcmr
  const salesGap = requiredSales - sales

  // 按当前各系列的占比分配增量
  const salesGapPerTier: Record<string, number> = {}
  for (const [crName, cr] of Object.entries(result.categoryResults)) {
    for (const [tierName, tr] of Object.entries(cr.tierResults)) {
      const ratio = tr.ratio
      salesGapPerTier[`${crName}-${tierName}`] = salesGap * ratio
    }
  }

  // B. 提高毛利率
  const requiredGrossMargin = sales > 0
    ? result.variableCostRate + (targetProfit + fc - subsidy) / sales
    : 0
  const grossMarginGap = requiredGrossMargin - result.grossMarginRate

  // C. 压降费用
  const requiredCostReduction = result.profit - targetProfit

  return {
    requiredSales, salesGap, salesGapPerTier,
    requiredGrossMargin, grossMarginGap,
    requiredCostReduction,
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add profit target goal-seek calculation engine"
```

---

### Task 4: 反推结果显示组件

**Files:**
- Create: `src/renderer/src/modes/simple/components/analysis/GoalSeekPanel.tsx`
- Modify: `src/renderer/src/modes/simple/SimpleApp.tsx`（新增面板渲染）
- Modify: `src/renderer/src/modes/professional/pages/CalculatorPage.tsx`（新增面板渲染）

**Step 1: 创建 GoalSeekPanel**

```tsx
import { useState, useMemo } from 'react'
import { useScenario } from '../../../../shared/context/ScenarioContext'
import { goalSeek } from '../../../../shared/calc/goalSeek'
import { useFormatMoney } from '../../../../shell/UnitContext'

export default function GoalSeekPanel() {
  const { state } = useScenario()
  const { formatMoney } = useFormatMoney()
  const [targetProfit, setTargetProfit] = useState<number>(0)
  const result = state.result

  const gs = useMemo(() => {
    if (!result || targetProfit <= 0) return null
    return goalSeek(result, targetProfit)
  }, [result, targetProfit])

  if (!result) return null

  return (
    <div className="surface p-4 mt-3">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">目标利润反推</h3>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] text-[var(--text-muted)]">目标利润</span>
        <input type="number" min={0} step={1000}
          value={targetProfit || ''}
          onChange={e => setTargetProfit(parseFloat(e.target.value) || 0)}
          placeholder="输入目标利润"
          className="flex-1 border border-[var(--border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] tabular-nums" />
        <span className="text-[11px] text-[var(--text-muted)]">元/月</span>
      </div>
      {gs ? (
        gs.requiredSales === null ? (
          <p className="text-[11px] text-red-500">当前条件下加权 CMR ≤ 0，无法盈利</p>
        ) : (
          <div className="space-y-2 text-[11px]">
            <div className="bg-[var(--bg)] rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">方案A：需提高销售额至</span>
                <span className="font-bold text-[var(--accent)]">¥{formatMoney(gs.requiredSales!)}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">需增长 ¥{formatMoney(gs.salesGap!)}（{(gs.salesGap! / result.totalSales * 100).toFixed(1)}%）</span>
            </div>
            <div className="bg-[var(--bg)] rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">方案B：需提高毛利率至</span>
                <span className="font-bold text-[var(--accent)]">{(gs.requiredGrossMargin! * 100).toFixed(1)}%</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">需提升 {(gs.grossMarginGap! * 100).toFixed(1)} 个百分点</span>
            </div>
            <div className="bg-[var(--bg)] rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">方案C：需压降费用</span>
                <span className="font-bold text-[var(--accent)]">¥{formatMoney(gs.requiredCostReduction!)}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">当前利润 ¥{formatMoney(result.profit)}</span>
            </div>
          </div>
        )
      ) : (
        <p className="text-[11px] text-[var(--text-muted)]">输入目标利润后自动计算</p>
      )}
    </div>
  )
}
```

**Step 2: 在简洁模式添加**

在 `SimpleApp.tsx` 的 `SingleCategoryView` 中添加，位于 `FixedCostInput` 之后：
```tsx
import GoalSeekPanel from './components/analysis/GoalSeekPanel'
// 在 FixedCostInput 后面添加：
<GoalSeekPanel />
```

**Step 3: 在专业模式添加**

在 `CalculatorPage.tsx` 的 `tab === 'single'` 分支中，`FixedCostInput` 之后同样添加 `<GoalSeekPanel />`。

**Step 4: 验证**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npx electron-vite build`
Expected: 编译通过

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add profit target goal-seek panel"
```

---

## 执行顺序总结

| Phase | Tasks | 依赖 |
|-------|-------|------|
| 1. 批量导入后台 | Task 1 | 无 |
| 2. 批量对比渲染层 | Task 2 | Task 1 |
| 3. 利润反推计算引擎 | Task 3 | 无 |
| 4. 利润反推 UI | Task 4 | Task 3 |

可并行：
- Task 1 + Task 3 可并行（后端和计算引擎互不依赖）
- Task 2 和 Task 4 可并行（UI 互不依赖，但都依赖各自的 Task 1/3）
