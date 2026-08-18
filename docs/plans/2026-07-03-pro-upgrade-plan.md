# 财务专业模式升级计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为财务专业模式增加 4 项高级分析功能，与简洁版拉开差距。

**Architecture:** 新增 2 个页面（敏感性分析、多期间趋势）+ 升级 2 个现有组件（瀑布图、GoalSeek）。所有计算逻辑放在 `shared/calc/` 下，UI 组件放在 `modes/professional/` 下。路由和侧边栏同步更新。

**Tech Stack:** React + TypeScript + Recharts + Framer Motion + TailwindCSS 4 + 现有 ScenarioContext 状态管理

---

## 功能概览

| # | 功能 | 类型 | 页面路径 |
|---|---|---|---|
| 1 | 敏感性分析（What-if 矩阵） | 新页面 | `/sensitivity` |
| 2 | 多期间趋势对比 | 新页面 | `/trend` |
| 3 | 盈利结构瀑布拆解 | 升级现有 `/chart` 页面的瀑布图 | — |
| 4 | 目标反算增强 | 升级现有 GoalSeekPanel | — |

---

## Task 1: 敏感性分析（What-if 矩阵）

### 1.1 创建计算函数

**Files:**
- Create: `src/renderer/src/shared/calc/sensitivity.ts`

```typescript
import type { StoreResult } from '../types/scenario'

export interface SensitivityCell {
  salesChange: number    // -20, -10, 0, 10, 20 (百分比)
  cmrChange: number      // -3, -1, 0, 1, 3 (百分点)
  profit: number
  profitRate: number
  status: 'profit' | 'loss' | 'breakeven'
}

export interface SensitivityMatrix {
  salesSteps: number[]     // [-20, -10, 0, 10, 20]
  cmrSteps: number[]       // [-3, -1, 0, 1, 3]
  cells: SensitivityCell[]
  baseProfit: number
  baseSales: number
}

/**
 * 生成敏感性分析矩阵
 * @param result 当前测算结果
 * @param salesSteps 销售额变动幅度（百分比），默认 [-20, -10, 0, 10, 20]
 * @param cmrSteps CMR 变动幅度（百分点），默认 [-3, -1, 0, 1, 3]
 */
export function buildSensitivityMatrix(
  result: StoreResult,
  salesSteps: number[] = [-20, -10, 0, 10, 20],
  cmrSteps: number[] = [-3, -1, 0, 1, 3]
): SensitivityMatrix {
  const cells: SensitivityCell[] = []

  for (const sChange of salesSteps) {
    for (const cChange of cmrSteps) {
      const adjSales = result.totalSales * (1 + sChange / 100)
      const adjCMR = result.weightedCMR + cChange / 100
      const contribution = adjSales * adjCMR
      const profit = contribution + result.totalFixedCost * -1 + result.totalSubsidy
      const profitRate = adjSales > 0 ? profit / adjSales : 0

      cells.push({
        salesChange: sChange,
        cmrChange: cChange,
        profit: Math.round(profit),
        profitRate,
        status: profit > 100 ? 'profit' : profit < -100 ? 'loss' : 'breakeven',
      })
    }
  }

  return {
    salesSteps,
    cmrSteps,
    cells,
    baseProfit: result.profit,
    baseSales: result.totalSales,
  }
}
```

### 1.2 创建热力图组件

**Files:**
- Create: `src/renderer/src/modes/professional/components/SensitivityHeatmap.tsx`

```typescript
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { buildSensitivityMatrix } from '../../../shared/calc/sensitivity'
import type { StoreResult } from '../../../shared/types/scenario'
import { useFormatMoney } from '../../../shell/UnitContext'

interface Props {
  result: StoreResult
}

export default function SensitivityHeatmap({ result }: Props) {
  const { formatMoney } = useFormatMoney()

  const matrix = useMemo(() => buildSensitivityMatrix(result), [result])

  const getColor = (status: string, profit: number) => {
    if (status === 'profit') {
      const intensity = Math.min(Math.abs(profit) / Math.abs(matrix.baseProfit || 1), 1)
      return `rgba(52, 168, 83, ${0.15 + intensity * 0.55})`
    }
    if (status === 'loss') {
      const intensity = Math.min(Math.abs(profit) / Math.abs(matrix.baseProfit || 1), 1)
      return `rgba(234, 67, 53, ${0.15 + intensity * 0.55})`
    }
    return 'rgba(251, 188, 5, 0.3)'
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-2 text-[var(--muted-foreground)] font-medium text-left" rowSpan={2}>
                销售额变动 ↓<br />CMR变动 →
              </th>
              {matrix.cmrSteps.map(c => (
                <th key={c} className="px-3 py-2 text-center font-medium text-[var(--text-secondary)]">
                  {c > 0 ? '+' : ''}{c}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.salesSteps.map((s, si) => (
              <motion.tr
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: si * 0.05 }}
              >
                <td className="px-2 py-2 font-medium text-[var(--text-secondary)]">
                  {s > 0 ? '+' : ''}{s}%
                </td>
                {matrix.cmrSteps.map(c => {
                  const cell = matrix.cells.find(
                    cs => cs.salesChange === s && cs.cmrChange === c
                  )!
                  const isBase = s === 0 && c === 0
                  return (
                    <td
                      key={c}
                      className="px-3 py-2.5 text-center tabular-nums font-mono transition-colors"
                      style={{
                        backgroundColor: getColor(cell.status, cell.profit),
                        borderRadius: '6px',
                        fontWeight: isBase ? 700 : 400,
                        border: isBase ? '2px solid var(--primary)' : 'none',
                      }}
                    >
                      <div className={cell.status === 'profit' ? 'text-emerald-800' : cell.status === 'loss' ? 'text-red-800' : 'text-amber-800'}>
                        ¥{formatMoney(cell.profit)}
                      </div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        {(cell.profitRate * 100).toFixed(1)}%
                      </div>
                    </td>
                  )
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: 'rgba(52, 168, 83, 0.5)' }} />
          盈利
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: 'rgba(251, 188, 5, 0.3)' }} />
          临界
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: 'rgba(234, 67, 53, 0.5)' }} />
          亏损
        </span>
        <span className="ml-auto">红框 = 当前基准点</span>
      </div>
    </div>
  )
}
```

### 1.3 创建敏感性分析页面

**Files:**
- Create: `src/renderer/src/modes/professional/pages/SensitivityPage.tsx`

页面结构：
- 标题 + 说明
- GlowingCard 包裹的 SensitivityHeatmap
- 底部文字解读区（自动分析安全区间）

### 1.4 注册路由和侧边栏

**Files:**
- Modify: `src/renderer/src/modes/professional/ProApp.tsx` — 添加 `/sensitivity` 路由
- Modify: `src/renderer/src/modes/professional/components/ProLayout.tsx` — 侧边栏添加「敏感性分析」导航项

侧边栏图标：`M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z`（复用图表图标，或用网格图标）

---

## Task 2: 多期间趋势对比

### 2.1 定义期间数据类型

**Files:**
- Modify: `src/renderer/src/shared/types/scenario.ts` — 添加 `PeriodData` 接口

```typescript
export interface PeriodData {
  label: string           // 如 "2026年1月"
  sales: number
  grossProfit: number
  variableCost: number
  fixedCost: number
  profit: number
  grossMarginRate: number
  cmr: number
  profitRate: number
  breakevenSales: number | null
}
```

### 2.2 创建期间存储服务

**Files:**
- Create: `src/renderer/src/modes/professional/services/periodStore.ts`

使用 `localStorage` 存储多期间数据：
- `savePeriod(storeName, data: PeriodData)` — 保存/更新某月数据
- `loadPeriods(storeName): PeriodData[]` — 加载某门店所有期间
- `deletePeriod(storeName, label)` — 删除某期间
- `clearPeriods(storeName)` — 清空

### 2.3 创建趋势图表组件

**Files:**
- Create: `src/renderer/src/modes/professional/components/TrendChart.tsx`

双 Y 轴折线图：
- 左轴：销售额、利润（柱状图 + 折线）
- 右轴：毛利率、CMR（折线，百分比）
- X 轴：期间标签
- 用 Recharts `ComposedChart` 实现

### 2.4 创建趋势分析页面

**Files:**
- Create: `src/renderer/src/modes/professional/pages/TrendPage.tsx`

页面结构：
- 顶部：期间列表（可删除单条）+ 「保存当前测算为本期」按钮
- 中部：TrendChart 趋势图
- 底部：期间明细表格

### 2.5 注册路由和侧边栏

**Files:**
- Modify: `src/renderer/src/modes/professional/ProApp.tsx` — 添加 `/trend` 路由
- Modify: `src/renderer/src/modes/professional/components/ProLayout.tsx` — 侧边栏添加「趋势分析」导航项

---

## Task 3: 盈利结构瀑布拆解（升级版）

### 3.1 升级瀑布图数据结构

**Files:**
- Modify: `src/renderer/src/modes/professional/components/ProfitWaterfall.tsx`

将现有 6 项瀑布扩展为**价值驱动链**：

```
销售额 → −变动成本 → 毛利 → −变动费用 → 边际贡献 → +补贴 → 贡献净额 → −固定费用 → 利润
```

每个节点显示：
- 金额（¥）
- 占销售额百分比
- 颜色区分（收入绿、成本红、利润蓝）

### 3.2 添加指标卡片

在瀑布图上方增加 3 个关键指标：
- **加权 CMR**：`weightedCMR * 100`%
- **盈亏平衡销售额**：`breakevenSales`
- **安全边际率**：`safetyMarginRate * 100`%

### 3.3 添加交互

- hover 某个柱子时，tooltip 显示详细拆解
- 点击柱子可展开子项（如点击「变动费用」展开 18 项费用明细）

---

## Task 4: 目标反算增强

### 4.1 扩展 goalSeek 计算函数

**Files:**
- Modify: `src/renderer/src/shared/calc/goalSeek.ts`

新增计算维度：

```typescript
export interface EnhancedGoalSeekResult {
  // 原有
  requiredSales: number | null
  salesGap: number | null
  salesGapRate: number | null
  requiredGrossMargin: number | null
  grossMarginGap: number | null
  requiredCostReduction: number | null

  // 新增
  targetProfitRate: number | null        // 目标利润率
  requiredSalesForRate: number | null    // 达到目标利润率所需销售额
  feasibilityScore: number               // 可行性评分 0-100
  multiVarSolutions: MultiVarSolution[]  // 多变量联动方案
}

export interface MultiVarSolution {
  label: string          // "保守方案" / "均衡方案" / "激进方案"
  salesChange: number    // 销售额变动%
  marginChange: number   // 毛利率变动百分点
  costChange: number     // 费用变动%
  description: string    // 可读描述
}
```

可行性评分逻辑：
- gap < 10% → 90分
- gap < 20% → 70分
- gap < 30% → 50分
- gap > 50% → 20分

多变量联动方案（3 种）：
- **保守**：主要靠提销售额（salesChange 大，marginChange 小）
- **均衡**：销售额+毛利率+费用三管齐下
- **激进**：主要靠压费用提毛利（costChange 大）

### 4.2 升级 GoalSeekPanel UI

**Files:**
- Modify: `src/renderer/src/modes/simple/components/analysis/GoalSeekPanel.tsx`

升级内容：
- 添加**目标利润率**输入（与目标利润额并列）
- 添加**可行性评分**仪表盘（环形进度条）
- 添加**多变量联动方案**卡片（3 列并排）
- 每个方案卡片显示：方案名 + 变动指标 + 一句话描述

---

## Task 5: 路由和导航集成

### 5.1 更新 ProApp 路由

**Files:**
- Modify: `src/renderer/src/modes/professional/ProApp.tsx`

```diff
+ import SensitivityPage from './pages/SensitivityPage'
+ import TrendPage from './pages/TrendPage'

  <Routes>
    <Route path="/" element={<CalculatorPage />} />
    <Route path="/result" element={<ResultPage />} />
    <Route path="/chart" element={<ChartPage />} />
+   <Route path="/sensitivity" element={<SensitivityPage />} />
+   <Route path="/trend" element={<TrendPage />} />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/compare" element={<ComparePage />} />
  </Routes>
```

### 5.2 更新侧边栏导航

**Files:**
- Modify: `src/renderer/src/modes/professional/components/ProLayout.tsx`

在 `NAV_ITEMS` 中添加：
```typescript
{ path: '/sensitivity', label: '敏感性分析', icon: 'M4 4v5h...' },
{ path: '/trend', label: '趋势分析', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
```

插入位置：`/chart` 之后、`/history` 之前。

---

## 实施顺序

| 顺序 | Task | 预计耗时 | 依赖 |
|---|---|---|---|
| 1 | Task 1: 敏感性分析 | 30min | 无 |
| 2 | Task 4: GoalSeek 增强 | 20min | 无 |
| 3 | Task 3: 瀑布图升级 | 15min | 无 |
| 4 | Task 2: 多期间趋势 | 40min | 需要 periodStore |
| 5 | Task 5: 路由集成 | 10min | Task 1-4 完成后 |

**总计：约 2 小时**

---

## 验证标准

- [ ] 敏感性矩阵：输入数据后，热力图正确显示红/绿/黄区域，基准点有红框
- [ ] 多期间趋势：可保存多个月份数据，趋势图正确渲染，可删除单条
- [ ] 瀑布图：显示 8 个节点的价值驱动链，hover 有详细 tooltip
- [ ] GoalSeek：输入目标利润率后，可行性评分和多变量方案正确计算
- [ ] 路由：侧边栏新增 2 个导航项，点击可正常跳转
- [ ] 清空数据：所有新页面在数据为空时不崩溃，显示友好提示
