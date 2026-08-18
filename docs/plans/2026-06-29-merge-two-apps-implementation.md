# TCL门店盈利测算（合并版）实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将门店简洁版和财务专业版合并为单一应用，支持模式切换，共享计算引擎和方案库。

**Architecture:** 方案B——双子应用 + 共享核心层。以门店简洁版技术栈为底座，提取共享核心（类型/计算/存储/Excel），门店简洁模式迁移现有UI，财务专业模式新建5页面路由。采用Google设计规范统一视觉语言。

**Tech Stack:** Electron 33 + electron-vite + React 19 + TypeScript + Tailwind CSS 4 + Recharts + sql.js + exceljs + react-router-dom 7

**Source Projects:**
- 门店简洁版：`d:\代码\经营模拟测算应用（门店简洁版）`
- 财务专业版：`d:\代码\经营模拟测算应用（财务专业版）`
- 合并目标：`d:\代码\TCL门店盈利测算（合并版）`
- Google设计规范：`D:\Google`

---

## Phase 1: 项目脚手架与配置

### Task 1: 初始化项目结构

**Files:**
- Create: `d:\代码\TCL门店盈利测算（合并版）\package.json`
- Create: `d:\代码\TCL门店盈利测算（合并版）\electron.vite.config.ts`
- Create: `d:\代码\TCL门店盈利测算（合并版）\tsconfig.json`
- Create: `d:\代码\TCL门店盈利测算（合并版）\tsconfig.node.json`
- Create: `d:\代码\TCL门店盈利测算（合并版）\tsconfig.web.json`
- Create: `d:\代码\TCL门店盈利测算（合并版）\.gitignore`
- Create: `d:\代码\TCL门店盈利测算（合并版）\electron-builder.yml`

**Step 1: 创建 package.json**

基于门店简洁版 `d:\代码\经营模拟测算应用（门店简洁版）\package.json`，新增 `react-router-dom`：

```json
{
  "name": "tcl-store-profit-calculator-merged",
  "version": "1.0.0",
  "description": "TCL门店盈利测算（合并版）",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "build:win": "npm run build && electron-builder --win",
    "build:mac": "npm run build && electron-builder --mac",
    "build:linux": "npm run build && electron-builder --linux"
  },
  "dependencies": {
    "exceljs": "^4.4.0",
    "react-router-dom": "^7.16.0",
    "sql.js": "^1.14.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "@types/node": "^25.9.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "png-to-ico": "^3.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0",
    "tailwindcss": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

**Step 2: 创建 electron.vite.config.ts**

从门店简洁版 `d:\代码\经营模拟测算应用（门店简洁版）\electron.vite.config.ts` 复制，保持结构不变。

**Step 3: 创建 tsconfig 文件**

从门店简洁版复制 `tsconfig.json`、`tsconfig.node.json`、`tsconfig.web.json`。

**Step 4: 创建 .gitignore 和 electron-builder.yml**

从门店简洁版复制 `.gitignore` 和 `electron-builder.yml`，修改 productName 为 `TCL门店盈利测算`。

**Step 5: 安装依赖**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm install`
Expected: 安装成功，node_modules 创建

**Step 6: Commit**

```bash
git init
git add -A
git commit -m "chore: initialize project scaffold"
```

---

### Task 2: 创建 HTML 入口和全局样式

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/index.css`
- Create: `src/renderer/src/env.d.ts`

**Step 1: 创建 index.html**

从门店简洁版 `src/renderer/index.html` 复制，修改 title 为 `TCL门店盈利测算`。

**Step 2: 创建 index.css（Google设计规范token）**

```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --background: #ffffff;
  --foreground: #0e1115;
  --card: #ffffff;
  --popover: #f9f9fa;
  --muted: #eff1f4;
  --muted-foreground: #7f8d9f;

  --primary: #4285f4;
  --primary-foreground: #ffffff;
  --secondary: #dbeafe;
  --secondary-foreground: #333942;
  --accent: #dbeafe;
  --accent-foreground: #003e8f;
  --destructive: #ef4444;

  --border: #ebebeb;
  --border-light: #f5f5f5;
  --input: #e2e3e4;
  --ring: #4285f4;

  --chart-1: #4285f4;
  --chart-2: #ea4335;
  --chart-3: #fbbc05;
  --chart-4: #34a853;
  --chart-5: #0043ad;

  --sidebar: #f0f6ff;
  --sidebar-foreground: #0e1115;
  --sidebar-primary: #4285f4;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #dbeafe;
  --sidebar-accent-foreground: #003e8f;
  --sidebar-border: #e7eaef;

  --font-sans: 'DM Sans', ui-sans-serif, sans-serif, system-ui;
  --font-mono: 'JetBrains Mono', monospace;

  --radius: 0.5rem;
  --spacing: 0.24rem;

  --positive: #34a853;
  --negative: #ea4335;
  --warning: #fbbc05;
  --warning-soft: #fef3c7;
  --danger-soft: #fee2e2;
  --success-soft: #d1fae5;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
}

.surface {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.surface-elevated {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
}

.btn-press:active {
  transform: translateY(1px);
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  -webkit-appearance: none;
  appearance: textfield;
}
```

**Step 3: 创建 main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 4: 创建 App.tsx（占位）**

```tsx
export default function App() {
  return <div>TODO: AppShell</div>
}
```

**Step 5: 创建 env.d.ts**

从门店简洁版 `src/renderer/src/env.d.ts` 复制。

**Step 6: 验证 dev 启动**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm run dev`
Expected: Electron窗口打开，显示"TODO: AppShell"

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: setup html entry and google design tokens"
```

---

## Phase 2: 共享核心层

### Task 3: 统一品类配置

**Files:**
- Create: `src/renderer/src/shared/constants/categories.ts`

**Step 1: 创建品类配置**

```typescript
/** 统一品类列表 */
export const CATEGORIES = ['智屏', '白电', '空调', 'CIoT'] as const
export type Category = (typeof CATEGORIES)[number]

/** 品类颜色（Google chart palette） */
export const CATEGORY_COLORS: Record<string, string> = {
  '智屏': '#4285f4',
  '白电': '#ea4335',
  '空调': '#fbbc05',
  'CIoT': '#34a853',
}

/** 品类英文名（用于内部标识） */
export const CATEGORY_CODES: Record<string, string> = {
  '智屏': 'tv',
  '白电': 'appliance',
  '空调': 'ac',
  'CIoT': 'ciot',
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add unified category constants"
```

---

### Task 4: 统一数据模型

**Files:**
- Create: `src/renderer/src/shared/types/scenario.ts`

**Step 1: 创建类型定义**

从门店简洁版 `src/renderer/src/types/scenario.ts` 复制全部内容，做以下修改：
1. 新增 `InputMode` 类型
2. `CategoryData` 新增 `inputMode?` 字段
3. `CalculationScenario` 新增 `sourceMode?` 字段
4. 新增 `CVPDataPoint` 和 `CVPData` 接口（从财务专业版迁移）

```typescript
/** 输入模式 */
export type InputMode = 'amount' | 'rate'

/** 变动费用核算模式 */
export type CostMode = 'modeA' | 'modeB'

/** 单个 X/C/P/S 系列数据 */
export interface TierData {
  sales: number
  volume: number
  grossMargin: number
  subsidy?: number
}

/** 变动费用（包含两种模式所有费用项，均为小数） */
export interface VariableCosts {
  commission: number
  annualRebate: number
  retailDiscount: number
  salesCommission: number
  businessCommission: number
  extraIncentive: number
  logisticsFee: number
  contractRebate: number
  channelIncentiveOnline: number
  commissionSales: number
  commissionBusiness: number
  retailIncentive: number
  extraRebate: number
  promotionSupport: number
  channelIncentivePrivate: number
  channelIncentiveReferral: number
  promotionFee: number
  salesGap: number
}

export type CostLevel = 'store' | 'category'

export interface FixedCosts {
  venueFee: number
  operationSupport: number
  laborCost: number
  dailyExpense: number
  boothCost: number
}

/** 品类数据 */
export interface CategoryData {
  category: string
  costMode: CostMode
  productStructure: Record<string, TierData>
  variableCosts: VariableCosts
  exclusiveFixedCosts?: FixedCosts
  inputMode?: InputMode
}

/** 测算方案 */
export interface CalculationScenario {
  id: string
  name: string
  mode: 'single' | 'multi'
  createdAt?: string
  updatedAt?: string
  storeName: string
  storeFixedCosts: FixedCosts
  sourceMode?: 'simple' | 'professional'
  singleCategory?: { category: string; data: CategoryData }
  multiCategory?: { selectedCategories: string[]; categories: Record<string, CategoryData> }
}

/** 系列计算结果 */
export interface TierResult {
  sales: number
  volume: number
  ratio: number
  grossMargin: number
  cmr: number
  contributionAmount: number
}

/** 品类计算结果 */
export interface CategoryResult {
  category: string
  totalSales: number
  totalGrossProfit: number
  totalVariableCost: number
  variableCostRate: number
  weightedCMR: number
  contributionAmount: number
  tierResults: Record<string, TierResult>
}

/** 阶梯图段 */
export interface StepSegment {
  label: string
  category: string
  sales: number
  cumulativeSales: number
  cmr: number
  contributionAmount: number
  cumulativeContribution: number
  color: string
}

export interface StepChartData {
  segments: StepSegment[]
  storeFC: number
  categoryFC?: number
  storeBEP: { sales: number; label: string } | null
  categoryBEP?: { sales: number; label: string } | null
  currentSales: number
}

/** 门店总计算结果 */
export interface StoreResult {
  totalSales: number
  totalGrossProfit: number
  totalVariableCost: number
  totalFixedCost: number
  contributionAmount: number
  totalSubsidy: number
  dailyContributionAmount: number
  dailyContributionRate: number
  profit: number
  grossMarginRate: number
  variableCostRate: number
  weightedCMR: number
  breakevenSales: number | null
  safetyMarginRate: number | null
  categoryBEP?: number | null
  categoryResults: Record<string, CategoryResult>
  stepChartData: StepChartData
}

/** CVP 数据点（财务专业模式用） */
export interface CVPDataPoint {
  sales: number
  revenue: number
  variableCost: number
  fixedCost: number
  totalCost: number
  profit: number
}

/** CVP 数据 */
export interface CVPData {
  category?: string
  level?: string
  data: CVPDataPoint[]
  breakEvenPoint?: { sales: number; revenue: number }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add unified data model with InputMode and CVP types"
```

---

### Task 5: 计算引擎迁移

**Files:**
- Create: `src/renderer/src/shared/calc/calculator.ts`
- Create: `src/renderer/src/shared/calc/analyzer.ts`
- Create: `src/renderer/src/shared/calc/cvp.ts`
- Create: `src/renderer/src/shared/calc/index.ts`

**Step 1: 迁移 calculator.ts**

从门店简洁版 `src/renderer/src/utils/calculator.ts` 复制全部内容到 `shared/calc/calculator.ts`，做以下修改：
- import 路径改为 `../types/scenario`
- `CATEGORY_COLORS` 改为从 `../constants/categories` 导入
- 将硬编码的 `'冰洗'` 改为 `'白电'`，`'门锁'` 改为 `'CIoT'`（CATEGORY_COLORS 已在新文件中统一）

**Step 2: 迁移 analyzer.ts**

从门店简洁版 `src/renderer/src/utils/analyzer.ts` 复制全部内容到 `shared/calc/analyzer.ts`，修改 import 路径。

**Step 3: 创建 cvp.ts（从财务专业版迁移）**

```typescript
import type { CategoryData, CVPData, CVPDataPoint } from '../types/scenario'
import { sumVariableCosts } from './calculator'

/** 生成 CVP 量本利分析数据点 */
export function generateCVPData(
  sales: number,
  variableCostRate: number,
  fixedCost: number,
  grossMargin: number,
  points: number = 20,
): CVPData {
  const maxSales = sales * 2
  const step = maxSales / points

  const data: CVPDataPoint[] = []
  for (let i = 0; i <= points; i++) {
    const s = step * i
    const revenue = s
    const variableCost = s * variableCostRate
    const totalCost = variableCost + fixedCost
    const profit = revenue * grossMargin - variableCost - fixedCost

    data.push({ sales: s, revenue, variableCost, fixedCost, totalCost, profit })
  }

  const cmr = grossMargin - variableCostRate
  const breakEvenSales = cmr > 0 ? fixedCost / cmr : 0

  return { data, breakEvenPoint: { sales: breakEvenSales, revenue: breakEvenSales } }
}

/** 生成 X/C/P/S 明细 CVP */
export function generateCategoryLevelCVPData(
  category: CategoryData,
  variableCost: number,
  fixedCost: number,
): Record<string, CVPData> {
  const totalSales = Object.values(category.productStructure).reduce((s, t) => s + t.sales, 0)
  const vcRate = totalSales > 0 ? variableCost / totalSales : 0

  const result: Record<string, CVPData> = {}
  for (const [level, data] of Object.entries(category.productStructure)) {
    result[level] = generateCVPData(data.sales, vcRate, fixedCost, data.grossMargin)
  }
  return result
}

/** 金额转点位 */
export function amountToRate(amount: number, sales: number): number {
  return sales > 0 ? amount / sales : 0
}

/** 点位转金额 */
export function rateToAmount(rate: number, sales: number): number {
  return rate * sales
}
```

**Step 4: 创建 index.ts barrel**

```typescript
export * from './calculator'
export * from './analyzer'
export * from './cvp'
```

**Step 5: 验证类型检查**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npx tsc --noEmit`
Expected: 无错误

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate calculation engine to shared layer"
```

---

### Task 6: 默认方案与 ScenarioContext 迁移

**Files:**
- Create: `src/renderer/src/shared/data/defaultScenario.ts`
- Create: `src/renderer/src/shared/context/ScenarioContext.tsx`

**Step 1: 迁移 defaultScenario.ts**

从门店简洁版 `src/renderer/src/data/defaultScenario.ts` 复制到 `shared/data/defaultScenario.ts`，修改 import 路径。如有 `'门锁'` 文本改为 `'CIoT'`。

**Step 2: 迁移 ScenarioContext.tsx**

从门店简洁版 `src/renderer/src/contexts/ScenarioContext.tsx` 复制到 `shared/context/ScenarioContext.tsx`，修改 import 路径：
- `../types/scenario` → `../types/scenario`
- `../utils/calculator` → `../calc/calculator`
- `../data/defaultScenario` → `../data/defaultScenario`

逻辑不变，保留所有 reducer action 和 computeResult。

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: migrate defaultScenario and ScenarioContext to shared layer"
```

---

## Phase 3: 主进程与 Preload

### Task 7: 主进程迁移

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/database.ts`
- Create: `src/main/ipc-handlers.ts`
- Create: `src/main/excel-parser.ts`
- Create: `src/main/template-generator.ts`

**Step 1: 迁移 index.ts**

从门店简洁版 `src/main/index.ts` 复制，修改：
- 窗口 title 改为 `'TCL门店盈利测算'`
- width 改为 `1440`

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TCL门店盈利测算',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  registerIpcHandlers()

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

**Step 2: 迁移 database.ts**

从门店简洁版 `src/main/database.ts` 复制，修改：
- 删除 createScenario 和 cloneScenario 中的10条上限检查（L93-L95, L133-L137）
- 抛出错误的代码块整段删除

**Step 3: 迁移 ipc-handlers.ts**

从门店简洁版 `src/main/ipc-handlers.ts` 复制，不做修改。

**Step 4: 迁移 excel-parser.ts**

从门店简洁版 `src/main/excel-parser.ts` 复制，品类名 `'冰洗'`→`'白电'`，`'门锁'`→`'CIoT'`。

**Step 5: 迁移 template-generator.ts**

从门店简洁版 `src/main/template-generator.ts` 复制，修改：
- L191: `'"智屏,空调,冰洗,门锁"'` → `'"智屏,白电,空调,CIoT"'`
- L560: `['智屏', '空调', '冰洗', '门锁']` → `['智屏', '白电', '空调', 'CIoT']`

**Step 6: 迁移 preload/index.ts**

从门店简洁版 `src/preload/index.ts` 复制，不做修改。

**Step 7: 验证 dev 启动**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm run dev`
Expected: Electron窗口打开，无控制台报错

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: migrate main process with category rename and no plan limit"
```

---

## Phase 4: 应用外壳

### Task 8: ModeContext 与启动选择页

**Files:**
- Create: `src/renderer/src/shell/ModeContext.tsx`
- Create: `src/renderer/src/shell/Launcher.tsx`
- Create: `src/renderer/src/shell/AppShell.tsx`

**Step 1: 创建 ModeContext**

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

export type AppMode = 'simple' | 'professional'

interface ModeContextValue {
  mode: AppMode
  setMode: (mode: AppMode) => void
  toggleMode: () => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem('lastMode')
    return (saved as AppMode) || 'simple'
  })

  const setMode = (m: AppMode) => {
    localStorage.setItem('lastMode', m)
    setModeState(m)
  }

  const toggleMode = () => setMode(mode === 'simple' ? 'professional' : 'simple')

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
```

**Step 2: 创建 Launcher（启动选择页）**

```tsx
import { useMode, type AppMode } from './ModeContext'

interface ModeCard {
  mode: AppMode
  title: string
  desc: string
  features: string[]
}

const CARDS: ModeCard[] = [
  {
    mode: 'simple',
    title: '门店简洁模式',
    desc: '面向门店店长和战区经理',
    features: ['智能诊断', '结构调整模拟', '阶梯图分析', '方案对比'],
  },
  {
    mode: 'professional',
    title: '财务专业模式',
    desc: '面向财务人员',
    features: ['金额/点位双模式', '5页面流程', 'CVP精细化分析', '利润瀑布图'],
  },
]

export default function Launcher() {
  const { setMode } = useMode()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
      <div className="max-w-3xl w-full px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 5-6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">TCL门店盈利测算</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">选择适合的模式开始测算</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {CARDS.map((card) => (
            <button
              key={card.mode}
              onClick={() => setMode(card.mode)}
              className="surface p-6 text-left hover:border-[var(--primary)] transition-all cursor-pointer btn-press"
            >
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">{card.title}</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">{card.desc}</p>
              <ul className="space-y-1.5">
                {card.features.map((f) => (
                  <li key={f} className="text-xs text-[var(--muted-foreground)] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--primary)]" />{f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: 创建 AppShell**

```tsx
import { useMode } from './ModeContext'
import Launcher from './Launcher'

export default function AppShell() {
  const { mode } = useMode()

  // 首次启动无 lastMode 时显示选择页
  if (!localStorage.getItem('lastMode')) {
    return <Launcher />
  }

  // 后续根据 mode 渲染对应 App
  // Task 9/10 中实现 SimpleApp 和 ProApp 后替换
  if (mode === 'simple') {
    return <div className="p-8 text-sm">SimpleApp（Task 9 实现）</div>
  }
  return <div className="p-8 text-sm">ProApp（Task 10 实现）</div>
}
```

**Step 4: 更新 App.tsx**

```tsx
import { ModeProvider } from './shell/ModeContext'
import AppShell from './shell/AppShell'

export default function App() {
  return (
    <ModeProvider>
      <AppShell />
    </ModeProvider>
  )
}
```

**Step 5: 验证启动选择页**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm run dev`
Expected: 显示模式选择页，点击后显示占位文字。重启后直接进入上次选择的模式。

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add ModeContext, Launcher, and AppShell"
```

---

## Phase 5: 门店简洁模式迁移

### Task 9: 迁移门店简洁模式组件

**Files:**
- Create: `src/renderer/src/modes/simple/SimpleApp.tsx`
- Create: `src/renderer/src/modes/simple/components/layout/AppLayout.tsx`
- Create: `src/renderer/src/modes/simple/components/inputs/TierInput.tsx`
- Create: `src/renderer/src/modes/simple/components/inputs/VariableCostInput.tsx`
- Create: `src/renderer/src/modes/simple/components/inputs/FixedCostInput.tsx`
- Create: `src/renderer/src/modes/simple/components/inputs/CategoryWizard.tsx`
- Create: `src/renderer/src/modes/simple/components/inputs/SeriesRemovalModal.tsx`
- Create: `src/renderer/src/modes/simple/components/charts/ContributionBarChart.tsx`
- Create: `src/renderer/src/modes/simple/components/charts/StepChartMulti.tsx`
- Create: `src/renderer/src/modes/simple/components/charts/CvpChart.tsx`
- Create: `src/renderer/src/modes/simple/components/analysis/AnalysisPanel.tsx`
- Create: `src/renderer/src/modes/simple/components/analysis/ScenarioCompare.tsx`
- Create: `src/renderer/src/modes/simple/components/analysis/MultiCompare.tsx`
- Create: `src/renderer/src/modes/simple/components/common/KpiCards.tsx`
- Create: `src/renderer/src/modes/simple/components/common/HelpModal.tsx`
- Create: `src/renderer/src/modes/simple/services/api.ts`
- Create: `src/renderer/src/modes/simple/hooks/useContainerSize.ts`

**Step 1: 批量迁移所有组件**

从门店简洁版 `src/renderer/src/components/` 下逐个复制对应文件到 `modes/simple/components/`，对每个文件做：
1. 修改 import 路径：`../../types/scenario` → `../../../shared/types/scenario`
2. 修改 import 路径：`../../utils/calculator` → `../../../shared/calc/calculator`
3. 修改 import 路径：`../../utils/analyzer` → `../../../shared/calc/analyzer`
4. 修改 import 路径：`../../contexts/ScenarioContext` → `../../../shared/context/ScenarioContext`
5. 修改 import 路径：`../../data/defaultScenario` → `../../../shared/data/defaultScenario`
6. 修改 import 路径：`../../data/costModeLabels` → `./data/costModeLabels`（本地复制）
7. 修改 import 路径：`../../hooks/useContainerSize` → `./hooks/useContainerSize`（本地复制）
8. 修改 import 路径：`../../services/api` → `./services/api`（本地复制）
9. 将文案中的 `'门锁'` 改为 `'CIoT'`，`'冰洗'` 改为 `'白电'`

**Step 2: 迁移 services/api.ts**

从门店简洁版 `src/renderer/src/services/api.ts` 复制到 `modes/simple/services/api.ts`，修改 import 路径。

**Step 3: 迁移 data/costModeLabels.ts 和 hooks/useContainerSize.ts**

从门店简洁版对应路径复制到 `modes/simple/` 下。

**Step 4: 创建 SimpleApp.tsx**

从门店简洁版 `src/renderer/src/App.tsx` 复制核心逻辑（SingleCategoryView, MultiCategoryView, AppContent），改造成 SimpleApp。主要修改：
- import 路径指向 `modes/simple/components/` 和 `../../../shared/`
- title 改为 `'TCL门店盈利测算'`
- AppLayout 的 actions 中新增模式切换按钮
- 文案中 `'门锁'`→`'CIoT'`，`'冰洗'`→`'白电'`

SimpleApp 结构：
```tsx
import { ScenarioProvider } from '../../../shared/context/ScenarioContext'
import AppLayout from './components/layout/AppLayout'
// ... 其他 import
import { useMode } from '../../shell/ModeContext'

function SimpleAppContent() {
  const { toggleMode } = useMode()
  // ... 沿用 AppContent 逻辑
  // actions 中添加：
  // <button onClick={toggleMode} className="...">切换财务专业模式</button>
}

export default function SimpleApp() {
  return (
    <ScenarioProvider>
      <SimpleAppContent />
    </ScenarioProvider>
  )
}
```

**Step 5: 更新 AppShell.tsx**

将 AppShell 中 simple 模式的占位替换为：
```tsx
import SimpleApp from '../modes/simple/SimpleApp'
// ...
if (mode === 'simple') {
  return <SimpleApp />
}
```

**Step 6: 验证门店简洁模式**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm run dev`
Expected: 选择门店简洁模式后，显示完整的单品类/多品类测算界面，功能与原门店简洁版一致。点击切换按钮可回到选择页。

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate simple mode with all components"
```

---

## Phase 6: 财务专业模式

### Task 10: ProApp 路由与布局

**Files:**
- Create: `src/renderer/src/modes/professional/ProApp.tsx`
- Create: `src/renderer/src/modes/professional/components/ProLayout.tsx`
- Create: `src/renderer/src/modes/professional/pages/CalculatorPage.tsx`
- Create: `src/renderer/src/modes/professional/pages/ResultPage.tsx`
- Create: `src/renderer/src/modes/professional/pages/ChartPage.tsx`
- Create: `src/renderer/src/modes/professional/pages/HistoryPage.tsx`
- Create: `src/renderer/src/modes/professional/pages/ComparePage.tsx`

**Step 1: 创建 ProLayout（侧边栏布局）**

```tsx
import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useMode } from '../../../shell/ModeContext'

const NAV_ITEMS = [
  { path: '/', label: '测算输入', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { path: '/result', label: '结果展示', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/chart', label: '图表可视化', icon: 'M3 3v18h18M7 16l4-4 4 4 5-6' },
  { path: '/history', label: '历史记录', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/compare', label: '方案对比', icon: 'M8 7h8m-8 5h8m-8 5h8M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2z' },
]

export default function ProLayout({ children }: { children: ReactNode }) {
  const { toggleMode } = useMode()

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-[260px] bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col py-6 px-3 gap-2">
        <div className="flex items-center gap-3 px-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 5-6" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--foreground)]">TCL门店盈利测算</h1>
            <p className="text-[10px] text-[var(--muted-foreground)]">财务专业模式</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
                }`
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            onClick={toggleMode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius)] text-xs font-medium border border-[var(--sidebar-border)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
          >
            切换门店简洁模式
          </button>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: 创建 ProApp（路由容器）**

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ScenarioProvider } from '../../../shared/context/ScenarioContext'
import ProLayout from './components/ProLayout'
import CalculatorPage from './pages/CalculatorPage'
import ResultPage from './pages/ResultPage'
import ChartPage from './pages/ChartPage'
import HistoryPage from './pages/HistoryPage'
import ComparePage from './pages/ComparePage'

export default function ProApp() {
  return (
    <ScenarioProvider>
      <HashRouter>
        <ProLayout>
          <Routes>
            <Route path="/" element={<CalculatorPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/chart" element={<ChartPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/compare" element={<ComparePage />} />
          </Routes>
        </ProLayout>
      </HashRouter>
    </ScenarioProvider>
  )
}
```

**Step 3: 创建5个页面占位**

每个页面先创建最简占位：
```tsx
export default function CalculatorPage() {
  return <div className="p-6"><h1 className="text-lg font-semibold">测算输入</h1><p className="text-sm text-[var(--muted-foreground)] mt-2">待实现</p></div>
}
// ResultPage, ChartPage, HistoryPage, ComparePage 同理
```

**Step 4: 更新 AppShell.tsx**

```tsx
import ProApp from '../modes/professional/ProApp'
// ...
if (mode === 'professional') {
  return <ProApp />
}
```

**Step 5: 验证路由**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm run dev`
Expected: 选择财务专业模式后，显示侧边栏布局，点击导航项切换页面（占位内容）。点击切换按钮回到门店简洁模式。

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add ProApp with router and sidebar layout"
```

---

### Task 11: 金额/点位切换组件

**Files:**
- Create: `src/renderer/src/modes/professional/components/AmountRateToggle.tsx`

**Step 1: 创建切换器**

```tsx
import { useState, type ReactNode } from 'react'
import type { InputMode } from '../../../shared/types/scenario'

interface Props {
  mode: InputMode
  onModeChange: (mode: InputMode) => void
  sales: number
  rate: number
  amount: number
  onRateChange: (rate: number) => void
  onAmountChange: (amount: number) => void
  label: string
}

export default function AmountRateToggle({
  mode, onModeChange, sales, rate, amount, onRateChange, onAmountChange, label,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--muted-foreground)] w-28 truncate">{label}</span>
      <div className="flex rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
        <button
          onClick={() => onModeChange('rate')}
          className={`px-2 py-1 text-[11px] font-medium ${mode === 'rate' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--muted-foreground)]'}`}
        >点位</button>
        <button
          onClick={() => onModeChange('amount')}
          className={`px-2 py-1 text-[11px] font-medium ${mode === 'amount' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--muted-foreground)]'}`}
        >金额</button>
      </div>
      <input
        type="number"
        value={mode === 'rate' ? (rate * 100).toFixed(2) : Math.round(amount)}
        onChange={(e) => {
          const v = parseFloat(e.target.value) || 0
          if (mode === 'rate') onRateChange(v / 100)
          else onAmountChange(v)
        }}
        className="w-20 px-2 py-1 text-xs border border-[var(--input)] rounded-[var(--radius)] tabular-nums"
      />
      <span className="text-[10px] text-[var(--muted-foreground)]">{mode === 'rate' ? '%' : '元'}</span>
      <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
        ≈ {mode === 'rate' ? `¥${Math.round(rate * sales).toLocaleString()}` : `${(amount / (sales || 1) * 100).toFixed(2)}%`}
      </span>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add AmountRateToggle component"
```

---

### Task 12: 测算输入页

**Files:**
- Modify: `src/renderer/src/modes/professional/pages/CalculatorPage.tsx`

**Step 1: 实现测算输入页**

复用门店简洁模式的 TierInput / VariableCostInput / FixedCostInput / CategoryWizard 组件，但用 AmountRateToggle 包裹变动费用输入。

页面结构：
- 品类选择（单品类/多品类 Tab，沿用门店简洁版逻辑）
- 渠道切换（KA/传统）
- 产品结构表格（复用 TierInput）
- 变动费用区（复用 VariableCostInput，增加金额/点位切换）
- 固定费用区（复用 FixedCostInput）

```tsx
import { useState } from 'react'
import { useScenario } from '../../../shared/context/ScenarioContext'
import TierInput from '../../simple/components/inputs/TierInput'
import VariableCostInput from '../../simple/components/inputs/VariableCostInput'
import FixedCostInput from '../../simple/components/inputs/FixedCostInput'
import KpiCards from '../../simple/components/common/KpiCards'
import type { InputMode } from '../../../shared/types/scenario'

export default function CalculatorPage() {
  const { state } = useScenario()
  const [inputMode, setInputMode] = useState<InputMode>('rate')
  const result = state.result

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">测算输入</h1>
        <div className="flex rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
          <button onClick={() => setInputMode('rate')} className={`px-3 py-1.5 text-xs font-medium ${inputMode === 'rate' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)]'}`}>点位模式</button>
          <button onClick={() => setInputMode('amount')} className={`px-3 py-1.5 text-xs font-medium ${inputMode === 'amount' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)]'}`}>金额模式</button>
        </div>
      </div>
      {result && <KpiCards result={result} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <TierInput />
          <VariableCostInput />
          <FixedCostInput />
        </div>
        <div className="space-y-4">
          {/* 参数模拟区 - 滑动条 */}
          {/* 复用门店简洁版的图表预览 */}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 验证输入页**

Run: `npm run dev` → 选择财务专业模式 → 测算输入页
Expected: 显示品类输入、费用输入、KPI卡片

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement CalculatorPage with amount/rate toggle"
```

---

### Task 13: 结果展示页

**Files:**
- Modify: `src/renderer/src/modes/professional/pages/ResultPage.tsx`

**Step 1: 实现结果展示页**

复用 KpiCards + AnalysisPanel，新增费率警告面板（读取 analyzer 结果）。

```tsx
import { useScenario } from '../../../shared/context/ScenarioContext'
import KpiCards from '../../simple/components/common/KpiCards'
import AnalysisPanel from '../../simple/components/analysis/AnalysisPanel'
import { analyze } from '../../../shared/calc/analyzer'

export default function ResultPage() {
  const { state } = useScenario()
  const result = state.result
  if (!result) return <div className="p-6 text-sm text-[var(--muted-foreground)]">请先输入测算数据</div>

  const analysis = analyze(result)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">结果展示</h1>
      {/* Hero: 门店利润大数字 */}
      <div className="surface p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-1">门店利润</p>
          <p className={`text-3xl font-bold tabular-nums ${result.profit >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
            ¥{Math.round(result.profit).toLocaleString()}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs text-[var(--muted-foreground)]">盈亏平衡点</p>
          <p className="text-lg font-semibold tabular-nums">
            {result.breakevenSales ? `¥${Math.round(result.breakevenSales).toLocaleString()}` : '无法盈利'}
          </p>
        </div>
      </div>
      <KpiCards result={result} />
      {/* 费率警告 */}
      <div className="surface p-4">
        <h3 className="text-sm font-semibold mb-3">费率分析</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[var(--muted-foreground)]">固定费率</span>
            <p className={`font-semibold ${result.totalFixedCost / result.totalSales > 0.13 ? 'text-[var(--negative)]' : result.totalFixedCost / result.totalSales > 0.10 ? 'text-[var(--warning)]' : 'text-[var(--positive)]'}`}>
              {((result.totalFixedCost / result.totalSales) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">变动费率</span>
            <p className={`font-semibold ${result.variableCostRate > 0.30 ? 'text-[var(--negative)]' : result.variableCostRate > 0.25 ? 'text-[var(--warning)]' : 'text-[var(--positive)]'}`}>
              {(result.variableCostRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">边际贡献率</span>
            <p className={`font-semibold ${result.dailyContributionRate < 0.08 ? 'text-[var(--warning)]' : 'text-[var(--positive)]'}`}>
              {(result.dailyContributionRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      <AnalysisPanel />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: implement ResultPage with warnings and analysis"
```

---

### Task 14: 图表可视化页

**Files:**
- Modify: `src/renderer/src/modes/professional/pages/ChartPage.tsx`
- Create: `src/renderer/src/modes/professional/components/ProfitWaterfall.tsx`
- Create: `src/renderer/src/modes/professional/components/RevenuePieChart.tsx`
- Create: `src/renderer/src/modes/professional/components/CostStackChart.tsx`

**Step 1: 创建利润瀑布图**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { StoreResult } from '../../../shared/types/scenario'

export default function ProfitWaterfall({ result }: { result: StoreResult }) {
  const data = [
    { name: '销售额', value: result.totalSales, fill: '#4285f4' },
    { name: '毛利额', value: result.totalGrossProfit, fill: '#4285f4' },
    { name: '变动费用', value: -result.totalVariableCost, fill: '#ea4335' },
    { name: '边际贡献', value: result.contributionAmount, fill: '#34a853' },
    { name: '固定费用', value: -result.totalFixedCost, fill: '#ea4335' },
    { name: '门店利润', value: result.profit, fill: result.profit >= 0 ? '#34a853' : '#ea4335' },
  ]
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7f8d9f' }} />
        <YAxis tick={{ fontSize: 11, fill: '#7f8d9f' }} tickFormatter={(v) => `¥${(v/10000).toFixed(0)}万`} />
        <Tooltip formatter={(v: number) => `¥${Math.round(v).toLocaleString()}`} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Step 2: 创建收入饼图**

```tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { StoreResult } from '../../../shared/types/scenario'
import { CATEGORY_COLORS } from '../../../shared/constants/categories'

export default function RevenuePieChart({ result }: { result: StoreResult }) {
  const data = Object.entries(result.categoryResults).map(([name, cr]) => ({
    name, value: cr.totalSales, fill: CATEGORY_COLORS[name] || '#7f8d9f',
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `¥${Math.round(v).toLocaleString()}`} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

**Step 3: 创建费用堆叠图**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { StoreResult } from '../../../shared/types/scenario'

export default function CostStackChart({ result }: { result: StoreResult }) {
  // 从品类结果中提取变动费用明细
  const data = Object.entries(result.categoryResults).map(([name, cr]) => ({
    name, 变动费用: cr.totalVariableCost, 固定费用: result.totalFixedCost,
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7f8d9f' }} />
        <YAxis tick={{ fontSize: 11, fill: '#7f8d9f' }} tickFormatter={(v) => `¥${(v/10000).toFixed(0)}万`} />
        <Tooltip formatter={(v: number) => `¥${Math.round(v).toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="变动费用" stackId="a" fill="#ea4335" radius={[0, 0, 0, 0]} />
        <Bar dataKey="固定费用" stackId="a" fill="#fbbc05" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Step 4: 实现 ChartPage**

```tsx
import { useScenario } from '../../../shared/context/ScenarioContext'
import CvpChart from '../../simple/components/charts/CvpChart'
import ProfitWaterfall from '../components/ProfitWaterfall'
import RevenuePieChart from '../components/RevenuePieChart'
import CostStackChart from '../components/CostStackChart'

export default function ChartPage() {
  const { state } = useScenario()
  const result = state.result
  if (!result) return <div className="p-6 text-sm text-[var(--muted-foreground)]">请先输入测算数据</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">图表可视化</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface p-4"><h3 className="text-sm font-semibold mb-3">量本利分析（CVP）</h3><CvpChart result={result} /></div>
        <div className="surface p-4"><h3 className="text-sm font-semibold mb-3">利润瀑布</h3><ProfitWaterfall result={result} /></div>
        <div className="surface p-4"><h3 className="text-sm font-semibold mb-3">收入结构</h3><RevenuePieChart result={result} /></div>
        <div className="surface p-4"><h3 className="text-sm font-semibold mb-3">费用构成</h3><CostStackChart result={result} /></div>
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement ChartPage with waterfall, pie, and stack charts"
```

---

### Task 15: 历史记录页

**Files:**
- Modify: `src/renderer/src/modes/professional/pages/HistoryPage.tsx`

**Step 1: 实现历史记录页**

```tsx
import { useState, useEffect } from 'react'
import { useScenario } from '../../../shared/context/ScenarioContext'
import { listScenarios, deleteScenario, getScenario } from '../../simple/services/api'

interface ScenarioListItem {
  id: string; name: string; mode: string; updated_at: string
}

export default function HistoryPage() {
  const { dispatch } = useScenario()
  const [list, setList] = useState<ScenarioListItem[]>([])
  const [filter, setFilter] = useState({ category: '', channel: '' })

  const load = async () => {
    setList(await listScenarios())
  }
  useEffect(() => { load() }, [])

  const handleLoad = async (id: string) => {
    const s = await getScenario(id)
    if (s) dispatch({ type: 'LOAD_SCENARIO', scenario: s.data, tab: s.data.mode === 'multi' ? 'multi' : 'single' })
  }
  const handleDelete = async (id: string) => {
    if (confirm('确定删除此方案？')) { await deleteScenario(id); load() }
  }

  const filtered = list.filter(s => {
    if (filter.category && !s.name.includes(filter.category)) return false
    return true
  })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">历史记录</h1>
      <div className="flex gap-3">
        <input placeholder="筛选方案名" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="px-3 py-1.5 text-xs border border-[var(--input)] rounded-[var(--radius)]" />
      </div>
      <div className="surface overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">方案名称</th>
              <th className="text-left px-4 py-2 font-medium">模式</th>
              <th className="text-left px-4 py-2 font-medium">更新时间</th>
              <th className="text-right px-4 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]">
                <td className="px-4 py-2.5">{s.name}</td>
                <td className="px-4 py-2.5">{s.mode === 'single' ? '单品类' : '多品类'}</td>
                <td className="px-4 py-2.5 text-[var(--muted-foreground)]">{new Date(s.updated_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleLoad(s.id)} className="px-2 py-1 text-[var(--primary)] hover:underline">加载</button>
                  <button onClick={() => handleDelete(s.id)} className="px-2 py-1 text-[var(--negative)] hover:underline ml-2">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: implement HistoryPage with filter and CRUD"
```

---

### Task 16: 方案对比页

**Files:**
- Modify: `src/renderer/src/modes/professional/pages/ComparePage.tsx`

**Step 1: 实现方案对比页**

复用门店简洁模式的 ScenarioCompare 组件。

```tsx
import { useState, useEffect } from 'react'
import { useScenario } from '../../../shared/context/ScenarioContext'
import ScenarioCompare from '../../simple/components/analysis/ScenarioCompare'
import { listScenarios, getScenario } from '../../simple/services/api'

interface ScenarioListItem { id: string; name: string; mode: string; updated_at: string }

export default function ComparePage() {
  const { state } = useScenario()
  const [list, setList] = useState<ScenarioListItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const result = state.result

  useEffect(() => { listScenarios().then(setList) }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">方案对比</h1>
      <div className="surface p-4">
        <h3 className="text-sm font-semibold mb-2">选择方案</h3>
        <div className="flex flex-wrap gap-2">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
              className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius)] border transition-colors ${
                selected.includes(s.id) ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >{s.name}</button>
          ))}
        </div>
      </div>
      {result && <ScenarioCompare currentResult={result} />}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: implement ComparePage with scenario selection"
```

---

## Phase 7: 集成与测试

### Task 17: 模式间数据共享验证

**Step 1: 验证共享方案库**

Run: `npm run dev`
1. 进入门店简洁模式，输入数据，保存方案
2. 切换到财务专业模式
3. 进入历史记录页，确认能看到刚保存的方案
4. 加载方案，确认数据正确回填

**Step 2: 验证反向**

1. 在财务专业模式保存方案
2. 切换到门店简洁模式
3. 确认方案可见且可加载

**Step 3: Commit**

```bash
git add -A
git commit -m "test: verify shared plan library across modes"
```

---

### Task 18: Google设计规范一致性检查

**Step 1: 检查 CSS token 使用**

全局搜索旧变量名 `--accent-soft`、`--text-primary`、`--radius-md` 等，确认已全部替换为 Google token。

**Step 2: 检查品类名**

全局搜索 `'冰洗'`、`'门锁'`，确认已全部替换为 `'白电'`、`'CIoT'`。

**Step 3: 检查图表配色**

确认 Recharts 组件使用 `CATEGORY_COLORS` 或 `--chart-*` 变量。

**Step 4: Commit**

```bash
git add -A
git commit -m "style: enforce Google design tokens and unified category names"
```

---

### Task 19: 打包验证

**Step 1: 构建应用**

Run: `cd "d:\代码\TCL门店盈利测算（合并版）"; npm run build:win`
Expected: 生成 `dist/installer.exe` 或 `release/` 下的安装包

**Step 2: 安装并验证**

安装 exe，启动应用，验证：
- 启动选择页正常
- 两模式切换正常
- 数据持久化正常
- Excel导入导出正常

**Step 3: Commit**

```bash
git add -A
git commit -m "build: verify windows packaging"
```

---

## 执行顺序总结

| Phase | Tasks | 依赖 |
|-------|-------|------|
| 1. 脚手架 | Task 1-2 | 无 |
| 2. 共享核心 | Task 3-6 | Phase 1 |
| 3. 主进程 | Task 7 | Phase 2 |
| 4. 应用外壳 | Task 8 | Phase 2+3 |
| 5. 门店简洁模式 | Task 9 | Phase 4 |
| 6. 财务专业模式 | Task 10-16 | Phase 4+5 |
| 7. 集成测试 | Task 17-19 | Phase 5+6 |

可并行的任务：
- Task 3-6 可并行（共享核心层各模块独立）
- Task 12-16 可并行（财务专业模式各页面独立，但都依赖 Task 10-11）
